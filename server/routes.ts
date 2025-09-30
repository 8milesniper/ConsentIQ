import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertConsentSessionSchema, insertVideoAssetSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { analyzeConsentVideo, transcribeAudio, determineAudioMismatch, scaleConfidence } from "./speechService";
import multer from "multer";
import * as fs from "fs";
import * as path from "path";
import Stripe from "stripe";

// Extend Express Request type to include user
interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    username: string;
  };
}

// Validation schemas for API requests
const updateConsentStatusSchema = z.object({
  status: z.enum(["pending", "granted", "denied", "revoked"]),
  videoAssetId: z.string().optional(),
});

const verifyConsentSchema = z.object({
  sessionId: z.string(),
  buttonChoice: z.enum(["granted", "denied"]),
  videoAssetId: z.string(),
});

// Set up multer for video file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req: any, file: any, cb: any) => {
    console.log('File upload - MIME type:', file.mimetype, 'Original name:', file.originalname);
    if (file.mimetype.startsWith('video/') || file.mimetype === 'application/octet-stream') {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  }
});

const uploadUrlRequestSchema = z.object({
  filename: z.string().min(1).max(255).regex(/^[a-zA-Z0-9._-]+$/, "Invalid filename format"),
  mimeType: z.string().regex(/^video\/(mp4|webm|quicktime|avi)$/, "Unsupported video format"),
});

// JWT secret - REQUIRED environment variable for security
// For development, provide secure fallback; for production, require explicit setting
const JWT_SECRET = process.env.JWT_SECRET || 
  (process.env.NODE_ENV === 'development' 
    ? 'consent_iq_secure_development_key_2024_random_string_32_chars_min_length_required'
    : undefined);
    
if (!JWT_SECRET) {
  console.error("❌ SECURITY ERROR: JWT_SECRET environment variable is required for production");
  console.error("Please set JWT_SECRET to a secure random string (32+ characters)");
  process.exit(1);
}

if (process.env.NODE_ENV === 'development' && !process.env.JWT_SECRET) {
  console.warn("⚠️  Using development JWT secret. Set JWT_SECRET environment variable for production.");
}
// TypeScript assertion - safe because we exit above if undefined
const SECRET = JWT_SECRET as string;

// Authentication middleware - reads from secure HTTP-only cookies
const requireAuth = (req: Request, res: any, next: any) => {
  const token = req.cookies?.auth_token;
  
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const decoded = jwt.verify(token, SECRET) as { userId: string; username: string };
    (req as AuthenticatedRequest).user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

// Subscription middleware - requires active subscription (no trials)
const requireSubscription = async (req: Request, res: any, next: any) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = await storage.getUser(authReq.user.userId);
    
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    
    // Check if user has an active subscription
    if (user.subscriptionStatus === 'active') {
      next();
    } else {
      res.status(403).json({ 
        error: "Active subscription required", 
        message: "Please subscribe to access this feature",
        subscriptionStatus: user.subscriptionStatus 
      });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to verify subscription" });
  }
};

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY is required');
  process.exit(1);
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Logout endpoint
  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });
    res.json({ success: true });
  });
  // Authentication Routes
  
  // Register new user
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const { username, password, fullName, phoneNumber, profilePicture } = validatedData;

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        res.status(409).json({ error: "Username already exists" });
        return;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);
      
      // Create user with all profile data
      const user = await storage.createUser({ 
        username, 
        password: hashedPassword,
        fullName,
        phoneNumber,
        profilePicture
      });

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        SECRET,
        { expiresIn: "7d" }
      );

      // Set secure HTTP-only cookie instead of sending token in response
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(201).json({ 
        user: { id: user.id, username: user.username }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid registration data", details: error.errors });
      } else {
        res.status(500).json({ error: "Registration failed" });
      }
    }
  });

  // Login user
  app.post("/api/auth/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      const { username, password } = validatedData;

      // Find user
      const user = await storage.getUserByUsername(username);
      if (!user) {
        res.status(401).json({ error: "Invalid username or password" });
        return;
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        res.status(401).json({ error: "Invalid username or password" });
        return;
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        SECRET,
        { expiresIn: "7d" }
      );

      // Set secure HTTP-only cookie instead of sending token in response
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({ 
        user: { 
          id: user.id, 
          username: user.username,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          profilePicture: user.profilePicture
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid login data", details: error.errors });
      } else {
        res.status(500).json({ error: "Login failed" });
      }
    }
  });

  // Get current user (requires auth)
  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = await storage.getUser(authReq.user.userId);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      res.json({ 
        id: user.id, 
        username: user.username,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        profilePicture: user.profilePicture,
        stripeCustomerId: user.stripeCustomerId,
        stripeSubscriptionId: user.stripeSubscriptionId,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionPlan: user.subscriptionPlan
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get user info" });
    }
  });

  // Stripe Subscription Routes
  
  // Create or get subscription for authenticated user
  app.post("/api/stripe/create-subscription", requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = await storage.getUser(authReq.user.userId);
      
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      // If user already has a subscription, check its status
      if (user.stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId, {
          expand: ['latest_invoice.payment_intent']
        });
        
        // If active, user already has access
        if (subscription.status === 'active') {
          const invoice = subscription.latest_invoice as any;
          const paymentIntent = invoice?.payment_intent;
          
          res.json({
            subscriptionId: subscription.id,
            clientSecret: paymentIntent?.client_secret || null,
            status: subscription.status
          });
          return;
        }
        
        // If incomplete, reuse it instead of creating a new one
        if (subscription.status === 'incomplete') {
          const invoice = subscription.latest_invoice as any;
          const paymentIntent = invoice?.payment_intent;
          
          res.json({
            subscriptionId: subscription.id,
            clientSecret: paymentIntent?.client_secret || null,
            status: subscription.status
          });
          return;
        }
      }

      // Get plan from request (monthly or annual)
      const { plan } = req.body;
      const priceId = plan === 'annual' 
        ? process.env.STRIPE_ANNUAL_PRICE_ID 
        : process.env.STRIPE_PRICE_ID;

      if (!priceId) {
        res.status(500).json({ error: "Price ID not configured" });
        return;
      }

      // Create or get Stripe customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          metadata: {
            userId: user.id,
            username: user.username
          }
        });
        customerId = customer.id;
      }

      // Create subscription with user metadata for webhook handling
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          userId: user.id,
        },
      });

      // Save Stripe info to user - use actual subscription status
      await storage.updateUserStripeInfo(
        user.id,
        customerId,
        subscription.id,
        plan || 'monthly',
        subscription.status
      );

      const invoice = subscription.latest_invoice as any;
      const paymentIntent = invoice.payment_intent;

      res.json({
        subscriptionId: subscription.id,
        clientSecret: paymentIntent.client_secret,
      });
    } catch (error: any) {
      console.error('Subscription creation error:', error);
      res.status(500).json({ error: error.message || "Failed to create subscription" });
    }
  });

  // Webhook for Stripe events (subscription updates, cancellations, etc.)
  app.post("/api/stripe/webhook", async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    try {
      let event;
      
      // Verify webhook signature if secret is configured
      if (webhookSecret && sig) {
        try {
          event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        } catch (err: any) {
          console.error('Webhook signature verification failed:', err.message);
          res.status(400).json({ error: 'Webhook signature verification failed' });
          return;
        }
      } else {
        // For development without webhook secret
        console.warn('⚠️ Stripe webhook signature verification skipped - set STRIPE_WEBHOOK_SECRET for production');
        event = req.body;
      }

      // Handle subscription events
      switch (event.type) {
        case 'invoice.payment_succeeded':
          // When payment succeeds, update subscription status to active
          const invoice = event.data.object;
          if (invoice.subscription) {
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
            
            // Update status to active when payment succeeds
            if (subscription.metadata?.userId) {
              await storage.updateUserSubscriptionStatus(subscription.metadata.userId, subscription.status);
            }
          }
          break;
          
        case 'customer.subscription.updated':
          const updatedSubscription = event.data.object;
          
          // Update user's subscription status
          if (updatedSubscription.metadata?.userId) {
            await storage.updateUserSubscriptionStatus(updatedSubscription.metadata.userId, updatedSubscription.status);
            
            // If subscription is canceled, schedule account deletion 7 days from cancellation
            if (updatedSubscription.status === 'canceled' && updatedSubscription.canceled_at) {
              const cancelDate = new Date(updatedSubscription.canceled_at * 1000);
              const subscriptionEndDate = updatedSubscription.current_period_end 
                ? new Date(updatedSubscription.current_period_end * 1000)
                : cancelDate;
              const deletionDate = new Date(subscriptionEndDate.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days after subscription ends
              
              await storage.scheduleAccountDeletion(
                updatedSubscription.metadata.userId,
                deletionDate,
                subscriptionEndDate
              );
            }
          }
          break;
          
        case 'customer.subscription.deleted':
          const deletedSubscription = event.data.object;
          
          // When subscription is deleted, schedule account deletion if not already scheduled
          if (deletedSubscription.metadata?.userId) {
            const now = new Date();
            const deletionDate = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days from deletion
            
            await storage.updateUserSubscriptionStatus(deletedSubscription.metadata.userId, 'canceled');
            await storage.scheduleAccountDeletion(
              deletedSubscription.metadata.userId,
              deletionDate,
              now
            );
          }
          break;
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // Consent Session Routes
  
  // Create new consent session (requires authentication and active subscription)
  app.post("/api/consent/sessions", requireAuth, requireSubscription, async (req, res) => {
    try {
      const sessionData = insertConsentSessionSchema.parse(req.body);
      const session = await storage.createConsentSession(sessionData);
      res.json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid session data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create consent session" });
      }
    }
  });

  // Get consent session by ID
  app.get("/api/consent/sessions/:id", async (req, res) => {
    try {
      const session = await storage.getConsentSession(req.params.id);
      if (!session) {
        res.status(404).json({ error: "Consent session not found" });
        return;
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to get consent session" });
    }
  });

  // Get consent session by QR code
  app.get("/api/consent/sessions/qr/:qrCodeId", async (req, res) => {
    try {
      const session = await storage.getConsentSessionByQrCode(req.params.qrCodeId);
      if (!session) {
        res.status(404).json({ error: "Consent session not found for QR code" });
        return;
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to get consent session" });
    }
  });

  // Update consent session status (public access for participants)
  app.patch("/api/consent/sessions/:id/status", async (req, res) => {
    try {
      const validatedData = updateConsentStatusSchema.parse(req.body);
      const { status, videoAssetId } = validatedData;
      
      // Validate that videoAssetId is provided when granting consent
      if (status === "granted" && !videoAssetId) {
        res.status(400).json({ error: "videoAssetId is required when granting consent" });
        return;
      }

      const session = await storage.updateConsentSessionStatus(req.params.id, status, videoAssetId);
      if (!session) {
        res.status(404).json({ error: "Consent session not found" });
        return;
      }
      
      res.json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update consent session status" });
      }
    }
  });

  // Video Asset Routes
  
  // Generate upload URL for video (public access for consent videos)
  app.post("/api/video/upload-url", async (req, res) => {
    try {
      const validatedData = uploadUrlRequestSchema.parse(req.body);
      const { filename, mimeType } = validatedData;

      const uploadData = await storage.generateUploadUrl(filename, mimeType);
      res.json(uploadData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid upload request", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to generate upload URL" });
      }
    }
  });

  // Create video asset metadata (public access for consent videos)
  app.post("/api/video/assets", async (req, res) => {
    try {
      const assetData = insertVideoAssetSchema.parse(req.body);
      const asset = await storage.createVideoAsset(assetData);
      res.json(asset);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid video asset data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create video asset" });
      }
    }
  });

  // Get video asset by ID (secured)
  app.get("/api/video/assets/:id", requireAuth, async (req, res) => {
    try {
      const asset = await storage.getVideoAsset(req.params.id);
      if (!asset) {
        res.status(404).json({ error: "Video asset not found" });
        return;
      }
      res.json(asset);
    } catch (error) {
      res.status(500).json({ error: "Failed to get video asset" });
    }
  });

  // DEVELOPMENT ONLY: Video blob upload endpoint (public access)
  if (process.env.NODE_ENV === "development") {
    app.post("/api/upload/:storageKey", async (req, res) => {
      try {
        // Handle raw video blob upload for consent recordings
        const chunks: Buffer[] = [];
        let totalSize = 0;
        
        req.on('data', (chunk) => {
          chunks.push(chunk);
          totalSize += chunk.length;
          // Limit upload size to 50MB
          if (totalSize > 50 * 1024 * 1024) {
            req.destroy();
            res.status(413).json({ error: "File too large" });
            return;
          }
        });
        
        req.on('end', () => {
          const buffer = Buffer.concat(chunks);
          console.log(`Consent video upload: ${req.params.storageKey}, size: ${buffer.length} bytes`);
          
          // In production, save to cloud storage here
          res.json({ 
            success: true, 
            storageKey: req.params.storageKey,
            size: buffer.length 
          });
        });
        
        req.on('error', (error) => {
          console.error('Upload stream error:', error);
          res.status(500).json({ error: "Upload stream error" });
        });
        
      } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: "Upload failed" });
      }
    });
  }

  // Speech Processing & Verification Endpoints
  
  // Process video for transcription and AI analysis
  app.post("/api/consent/process-video", upload.single('video'), async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No video file provided" });
        return;
      }

      const videoPath = req.file.path;
      const { sessionId, videoAssetId } = req.body;

      if (!sessionId || !videoAssetId) {
        res.status(400).json({ error: "Session ID and Video Asset ID required" });
        return;
      }

      // Get the consent session
      const consentSession = await storage.getConsentSession(sessionId);
      if (!consentSession) {
        fs.unlinkSync(videoPath); // Clean up
        res.status(404).json({ error: "Consent session not found" });
        return;
      }

      // Get the video asset
      const videoAsset = await storage.getVideoAsset(videoAssetId);
      if (!videoAsset) {
        fs.unlinkSync(videoPath); // Clean up
        res.status(404).json({ error: "Video asset not found" });
        return;
      }

      console.log(`Processing video for session ${sessionId}...`);

      // Extract audio from video and transcribe with Gemini
      const audioBuffer = fs.readFileSync(videoPath);
      const transcriptionResult = await transcribeAudio(audioBuffer, req.file.mimetype);
      const scaledTranscriptionConfidence = scaleConfidence(transcriptionResult.confidence);
      
      console.log(`Transcription: ${transcriptionResult.transcript} (confidence: ${scaledTranscriptionConfidence}%)`);

      // Store transcript in video asset
      await storage.updateVideoTranscript(
        videoAssetId,
        transcriptionResult.transcript,
        scaledTranscriptionConfidence
      );

      // Analyze video with Gemini AI for consent decision
      const analysisResult = await analyzeConsentVideo(videoPath, req.file.mimetype);
      const scaledAnalysisConfidence = scaleConfidence(analysisResult.confidence);
      
      console.log(`AI Analysis: ${JSON.stringify(analysisResult)}`);

      // Store ONLY the AI analysis result without corrupting verification state
      await storage.updateAiAnalysisResult(sessionId, analysisResult.decision);

      // Clean up uploaded file
      fs.unlinkSync(videoPath);

      res.json({
        success: true,
        analysis: {
          decision: analysisResult.decision,
          confidence: scaledAnalysisConfidence,
          reasoning: analysisResult.reasoning
        },
        transcription: {
          transcript: transcriptionResult.transcript,
          confidence: scaledTranscriptionConfidence
        },
        sessionId,
        videoAssetId
      });

    } catch (error) {
      console.error('Video processing error:', error);
      // Clean up file on error
      if (req.file?.path) {
        try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
      }
      res.status(500).json({ error: "Video processing failed" });
    }
  });

  // Verify consent decision against AI analysis
  app.post("/api/consent/verify", async (req, res) => {
    try {
      const validation = verifyConsentSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ error: "Invalid request data", details: validation.error.issues });
        return;
      }

      const { sessionId, buttonChoice, videoAssetId } = validation.data;

      // Get current session with stored AI analysis
      const session = await storage.getConsentSession(sessionId);
      if (!session) {
        res.status(404).json({ error: "Consent session not found" });
        return;
      }

      // Check if AI analysis was performed (should be stored from process-video step)
      if (!session.aiAnalysisResult) {
        res.status(400).json({ error: "Video must be processed before verification. AI analysis not found." });
        return;
      }

      // Get video asset for confidence data
      const videoAsset = await storage.getVideoAsset(videoAssetId);
      const confidence = videoAsset?.transcriptionConfidence || 0;
      
      // Use stored AI analysis result to determine mismatch
      const hasAudioMismatch = determineAudioMismatch(
        session.aiAnalysisResult, 
        buttonChoice, 
        confidence
      );

      console.log(`Verification: AI says "${session.aiAnalysisResult}", user clicked "${buttonChoice}", confidence: ${confidence}%, mismatch: ${hasAudioMismatch}`);

      // Update session with final verification results
      const updatedSession = await storage.updateConsentVerification(
        sessionId,
        buttonChoice,
        session.aiAnalysisResult, // Keep existing AI result
        hasAudioMismatch
      );

      if (!updatedSession) {
        res.status(500).json({ error: "Failed to update session verification" });
        return;
      }

      // Update consent status based on button choice (regardless of mismatch)
      await storage.updateConsentSessionStatus(sessionId, buttonChoice, videoAssetId);

      res.json({
        success: true,
        hasAudioMismatch,
        aiAnalysisResult: session.aiAnalysisResult,
        buttonChoice,
        confidence,
        verificationStatus: hasAudioMismatch ? "mismatch" : "verified",
        session: updatedSession
      });

    } catch (error) {
      console.error('Consent verification error:', error);
      res.status(500).json({ error: "Consent verification failed" });
    }
  });

  // Ask for Gemini API key if not provided
  if (!process.env.GEMINI_API_KEY) {
    console.warn("⚠️  GEMINI_API_KEY not found. Speech verification features will be limited.");
  }

  const httpServer = createServer(app);
  return httpServer;
}

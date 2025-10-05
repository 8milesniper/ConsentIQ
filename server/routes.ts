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
import { uploadConsentVideo, uploadProfilePicture, getSignedVideoUrl } from "./supabaseStorage";
import { createClient } from "@supabase/supabase-js";

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

// Get the video storage directory (configurable for different environments)
function getVideoStorageDir(): string {
  // Use environment variable if set, otherwise use project-relative path
  const videoDir = process.env.VIDEO_STORAGE_DIR || path.join(process.cwd(), 'consent-videos');
  
  // Ensure directory exists
  if (!fs.existsSync(videoDir)) {
    fs.mkdirSync(videoDir, { recursive: true });
    console.log(`Created video storage directory: ${videoDir}`);
  }
  
  return videoDir;
}

// Set up multer for video file uploads (memory storage for Supabase)
const memoryUpload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

// Set up multer for disk storage (for AI processing)
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
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function registerRoutes(app: Express): Promise<Server> {
  // Diagnostic endpoint to check deployment environment variables
  app.get("/api/env-check", (req, res) => {
    res.json({
      environment: process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'DEVELOPMENT',
      envVars: {
        DATABASE_URL: process.env.DATABASE_URL ? "✅ SET" : "❌ MISSING",
        JWT_SECRET: process.env.JWT_SECRET ? "✅ SET" : "❌ MISSING",
        STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? "✅ SET" : "❌ MISSING",
        STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID ? "✅ SET" : "❌ MISSING",
        SUPABASE_URL: process.env.SUPABASE_URL ? "✅ SET" : "❌ MISSING",
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅ SET" : "❌ MISSING"
      },
      timestamp: new Date().toISOString()
    });
  });

  // Diagnostic route: shows the Supabase URL being used in production
  app.get("/api/test-supabase", (req, res) => {
    res.json({
      SUPABASE_URL: process.env.SUPABASE_URL || "❌ NOT SET",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅ SET" : "❌ MISSING"
    });
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    res.json({ success: true });
  });
  // Authentication Routes
  
  // Register new user
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password, fullName, phoneNumber, profilePicture } = req.body;

      const supabaseClient = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const hashedPassword = await bcrypt.hash(password, 12);
      const userId = randomUUID();

      let profilePictureUrl: string | null = null;

      // Upload profile picture to Supabase Storage if provided
      if (profilePicture && profilePicture.startsWith('data:image/')) {
        try {
          // Convert base64 to buffer
          const base64Data = profilePicture.replace(/^data:image\/\w+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          
          // Upload to Supabase Storage
          profilePictureUrl = await uploadProfilePicture(buffer, `${userId}.jpg`);
          console.log('Profile picture uploaded:', profilePictureUrl);
        } catch (uploadError) {
          console.error('Profile picture upload failed:', uploadError);
          // Continue registration even if upload fails - picture is optional
        }
      }

      const { data, error } = await supabaseClient
        .from("users")
        .insert([
          {
            id: userId,
            username: username,
            password: hashedPassword,
            full_name: fullName,
            phone_number: phoneNumber,
            profile_picture_url: profilePictureUrl
          }
        ])
        .select()
        .single();

      if (error) {
        console.error("Supabase insert error:", error.message);
        return res.status(400).json({ error: error.message });
      }

      const token = jwt.sign(
        { userId: data.id, username: data.username },
        SECRET,
        { expiresIn: "7d" }
      );

      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });

      res.status(201).json({ success: true, user: data });
    } catch (err: any) {
      console.error("Signup handler error:", err);
      res.status(500).json({ error: "Internal server error" });
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
      // No subdomains, so sameSite: 'lax' works fine
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });

      res.json({ 
        user: { 
          id: user.id, 
          username: user.username,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          profilePicture: user.profilePicture,
          stripeCustomerId: user.stripeCustomerId,
          stripeSubscriptionId: user.stripeSubscriptionId,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionPlan: user.subscriptionPlan,
          subscriptionEndDate: user.subscriptionEndDate,
          accountDeletionDate: user.accountDeletionDate
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
        subscriptionPlan: user.subscriptionPlan,
        subscriptionEndDate: user.subscriptionEndDate,
        accountDeletionDate: user.accountDeletionDate
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get user info" });
    }
  });

  // Account Cleanup Routes
  
  // Cleanup expired accounts (requires admin authentication)
  app.post("/api/admin/cleanup-expired-accounts", async (req, res) => {
    // Verify admin token exists and matches
    const adminToken = req.headers['x-admin-token'];
    const requiredToken = process.env.ADMIN_CLEANUP_TOKEN;
    
    if (!requiredToken) {
      res.status(500).json({ error: "Server misconfiguration - admin token not set" });
      return;
    }
    
    if (!adminToken || adminToken !== requiredToken) {
      res.status(401).json({ error: "Unauthorized - Invalid admin token" });
      return;
    }

    try {
      const usersToDelete = await storage.getUsersScheduledForDeletion();
      
      if (usersToDelete.length === 0) {
        res.json({ message: "No accounts to delete", count: 0 });
        return;
      }

      // Delete each expired account
      for (const user of usersToDelete) {
        await storage.deleteUserAccount(user.id);
        console.log(`Deleted expired account: ${user.username} (${user.id})`);
      }

      res.json({ 
        message: `Successfully deleted ${usersToDelete.length} expired account(s)`,
        count: usersToDelete.length
      });
    } catch (error: any) {
      console.error('Cleanup error:', error);
      res.status(500).json({ error: error.message || "Failed to cleanup accounts" });
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
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        
        // If active, user already has access
        if (subscription.status === 'active') {
          res.json({
            status: 'active'
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

      // Create Checkout Session for subscription
      const baseUrl = process.env.FRONTEND_URL || 
        (process.env.NODE_ENV === 'production' 
          ? 'https://consentiq.tech'
          : `${req.protocol}://${req.get('host')}`);
        
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [
          { price: priceId, quantity: 1 }
        ],
        success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/cancel`,
        customer_email: user.username, // username is the email
        subscription_data: {
          metadata: {
            userId: user.id,
            plan: plan || 'monthly'
          },
        },
        metadata: {
          userId: user.id
        }
      });

      res.json({
        sessionId: session.id,
      });
    } catch (error: any) {
      console.error('Subscription creation error:', error);
      res.status(500).json({ error: error.message || "Failed to create subscription" });
    }
  });

  // Verify and activate subscription after payment (called when user returns from Stripe)
  app.post("/api/stripe/verify-payment", requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = await storage.getUser(authReq.user.userId);
      
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      // If no customer ID, can't verify payment
      if (!user.stripeCustomerId) {
        res.status(400).json({ error: "No payment information found" });
        return;
      }

      // Get all subscriptions for this customer
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        limit: 1,
        status: 'all',
      });

      if (subscriptions.data.length === 0) {
        res.status(400).json({ error: "No subscription found" });
        return;
      }

      // Get the most recent subscription
      const subscription = subscriptions.data[0];
      
      // Determine plan from price ID
      const priceId = subscription.items.data[0]?.price.id;
      const plan = priceId === process.env.STRIPE_ANNUAL_PRICE_ID ? 'annual' : 'monthly';

      // Update user's subscription info
      await storage.updateUserStripeInfo(
        user.id,
        user.stripeCustomerId,
        subscription.id,
        plan,
        subscription.status
      );

      // Return updated user
      const updatedUser = await storage.getUser(user.id);
      res.json({ 
        success: true,
        subscriptionStatus: subscription.status,
        user: updatedUser
      });
    } catch (error: any) {
      console.error('Payment verification error:', error);
      res.status(500).json({ error: error.message || "Failed to verify payment" });
    }
  });

  // Webhook handler moved to server/index.ts (needs raw body before JSON parser)

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
  app.get("/api/consent/sessions/:id", requireAuth, requireSubscription, async (req, res) => {
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
  app.get("/api/video/assets/:id", requireAuth, requireSubscription, async (req, res) => {
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

  // Video upload endpoint with SUPABASE STORAGE
  app.post("/api/upload", memoryUpload.single("video"), async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No video file provided" });
        return;
      }

      const fileBuffer = req.file.buffer;
      const sessionId = req.body.sessionId;
      const videoAssetId = req.body.videoAssetId;

      if (!sessionId || !videoAssetId) {
        res.status(400).json({ error: "Session ID and Video Asset ID required" });
        return;
      }

      // Verify video asset exists before upload
      const videoAsset = await storage.getVideoAsset(videoAssetId);
      if (!videoAsset) {
        res.status(404).json({ error: "Video asset not found" });
        return;
      }

      // Upload to Supabase consent-videos bucket
      const filename = `session-${sessionId}-${Date.now()}.webm`;
      let supabasePath;
      
      try {
        supabasePath = await uploadConsentVideo(fileBuffer, filename);
        console.log(`✅ VIDEO SAVED TO SUPABASE: ${supabasePath} (${fileBuffer.length} bytes)`);
      } catch (uploadErr: any) {
        console.error('Supabase upload failed:', uploadErr);
        res.status(500).json({ 
          error: "Failed to upload video to cloud storage",
          details: uploadErr.message 
        });
        return;
      }

      // Update video asset with Supabase storage path
      try {
        await storage.updateVideoAssetUrl(videoAssetId, supabasePath);
        console.log(`✅ DATABASE UPDATED: Video asset ${videoAssetId} -> ${supabasePath}`);
      } catch (dbErr: any) {
        console.error('Database update failed:', dbErr);
        res.status(500).json({ 
          error: "Video uploaded but database update failed",
          details: dbErr.message 
        });
        return;
      }

      // Return storage path (NOT public URL - this is a private bucket)
      res.json({ 
        success: true,
        path: supabasePath,
        size: fileBuffer.length
      });
    } catch (err: any) {
      console.error('Upload error:', err);
      res.status(500).json({ error: err.message || "Upload failed" });
    }
  });

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

      // SAVE VIDEO TO PERMANENT STORAGE FOR LEGAL RETRIEVAL
      const videoDir = getVideoStorageDir();
      const permanentFilename = videoAsset.storageKey.replace(/\//g, '_');
      const permanentPath = path.join(videoDir, permanentFilename);
      
      // Copy video to permanent storage (don't delete original yet)
      fs.copyFileSync(videoPath, permanentPath);
      console.log(`✅ VIDEO SAVED TO PERMANENT STORAGE: ${permanentPath}`);

      // Clean up temporary uploaded file
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

  // LEGAL VIDEO RETRIEVAL ENDPOINT - Secured with auth and subscription
  app.get("/api/video/download/:sessionId", requireAuth, requireSubscription, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { sessionId } = req.params;
      
      // Get the consent session
      const session = await storage.getConsentSession(sessionId);
      if (!session) {
        res.status(404).json({ error: "Consent session not found" });
        return;
      }
      
      // Verify the requesting user is the initiator (owner) of this session
      if (session.initiatorUserId !== authReq.user.userId) {
        res.status(403).json({ error: "Unauthorized: You can only access your own consent videos" });
        return;
      }
      
      // Get the video asset
      if (!session.videoAssetId) {
        res.status(404).json({ error: "No video associated with this consent session" });
        return;
      }
      
      const videoAsset = await storage.getVideoAsset(session.videoAssetId);
      if (!videoAsset) {
        res.status(404).json({ error: "Video asset not found in database" });
        return;
      }
      
      // Check if video is stored in Supabase (new videos)
      if (videoAsset.storageUrl) {
        try {
          // Generate signed URL for private video (short TTL - 5 minutes for proxy streaming)
          const signedUrl = await getSignedVideoUrl(videoAsset.storageUrl, 300);
          
          console.log(`📥 Legal video retrieval: User ${authReq.user.userId} downloading session ${sessionId} video ${videoAsset.id} from Supabase`);
          
          // Proxy stream from Supabase to client (keeps signed URL private)
          const response = await fetch(signedUrl);
          
          if (!response.ok || !response.body) {
            throw new Error(`Supabase fetch failed: ${response.statusText}`);
          }
          
          // Set appropriate headers for video streaming
          res.setHeader('Content-Type', videoAsset.mimeType || 'video/webm');
          res.setHeader('Content-Disposition', `attachment; filename="${videoAsset.filename}"`);
          if (videoAsset.fileSize) {
            res.setHeader('Content-Length', videoAsset.fileSize.toString());
          }
          
          // Convert web stream to Node.js stream and pipe to client
          const { Readable } = await import('stream');
          const nodeStream = Readable.fromWeb(response.body as any);
          nodeStream.pipe(res);
          return;
        } catch (error) {
          console.error('Failed to proxy video from Supabase:', error);
          res.status(500).json({ error: "Failed to retrieve video" });
          return;
        }
      }
      
      // Fallback: video stored in local filesystem (old videos)
      const videoDir = getVideoStorageDir();
      const filename = videoAsset.storageKey.replace(/\//g, '_');
      const filepath = path.join(videoDir, filename);
      
      // Check if video file exists
      if (!fs.existsSync(filepath)) {
        res.status(404).json({ 
          error: "Video file not found", 
          details: "The video may have been deleted according to retention policy",
          storageKey: videoAsset.storageKey
        });
        return;
      }
      
      // Set appropriate headers for video download
      res.setHeader('Content-Type', videoAsset.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${videoAsset.filename}"`);
      res.setHeader('Content-Length', videoAsset.fileSize.toString());
      
      // Stream the video file
      const fileStream = fs.createReadStream(filepath);
      fileStream.pipe(res);
      
      console.log(`📥 Legal video retrieval: User ${authReq.user.userId} downloaded session ${sessionId} video ${videoAsset.id} from local storage`);
      
    } catch (error) {
      console.error('Video download error:', error);
      res.status(500).json({ error: "Failed to download video" });
    }
  });

  // LEGAL DATA RETRIEVAL - Get full consent session data for legal purposes
  app.get("/api/legal/consent-session/:sessionId", requireAuth, requireSubscription, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { sessionId } = req.params;
      
      const session = await storage.getConsentSession(sessionId);
      if (!session) {
        res.status(404).json({ error: "Consent session not found" });
        return;
      }
      
      // Verify the requesting user is the initiator (owner)
      if (session.initiatorUserId !== authReq.user.userId) {
        res.status(403).json({ error: "Unauthorized: You can only access your own consent sessions" });
        return;
      }
      
      // Get video asset if exists
      let videoAsset = null;
      if (session.videoAssetId) {
        videoAsset = await storage.getVideoAsset(session.videoAssetId);
      }
      
      res.json({
        session,
        videoAsset,
        legalNote: "This data is legally binding consent verification record"
      });
      
    } catch (error) {
      console.error('Legal data retrieval error:', error);
      res.status(500).json({ error: "Failed to retrieve legal data" });
    }
  });

  // Ask for Gemini API key if not provided
  if (!process.env.GEMINI_API_KEY) {
    console.warn("⚠️  GEMINI_API_KEY not found. Speech verification features will be limited.");
  }

  const httpServer = createServer(app);
  return httpServer;
}

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertConsentSessionSchema, insertVideoAssetSchema } from "@shared/schema";
import { z } from "zod";

// Validation schemas for API requests
const updateConsentStatusSchema = z.object({
  status: z.enum(["pending", "granted", "denied", "revoked"]),
  videoAssetId: z.string().optional(),
});

const uploadUrlRequestSchema = z.object({
  filename: z.string().min(1).max(255).regex(/^[a-zA-Z0-9._-]+$/, "Invalid filename format"),
  mimeType: z.string().regex(/^video\/(mp4|webm|quicktime|avi)$/, "Unsupported video format"),
});

// Mock authentication middleware (replace with real auth in production)
const requireAuth = (req: any, res: any, next: any) => {
  // In production, verify JWT token or session
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Consent Session Routes
  
  // Create new consent session
  app.post("/api/consent/sessions", async (req, res) => {
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

  // Update consent session status (with proper validation)
  app.patch("/api/consent/sessions/:id/status", requireAuth, async (req, res) => {
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
  
  // Generate upload URL for video (secured and validated)
  app.post("/api/video/upload-url", requireAuth, async (req, res) => {
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

  // Create video asset metadata (secured)
  app.post("/api/video/assets", requireAuth, async (req, res) => {
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

  // DEVELOPMENT ONLY: Mock upload endpoint (remove in production)
  if (process.env.NODE_ENV === "development") {
    app.post("/api/upload/:storageKey", requireAuth, async (req, res) => {
      try {
        // Mock endpoint for development - handles fake video uploads
        console.warn("Using development upload endpoint - remove in production");
        res.json({ success: true, storageKey: req.params.storageKey });
      } catch (error) {
        res.status(500).json({ error: "Upload failed" });
      }
    });
  }

  const httpServer = createServer(app);
  return httpServer;
}

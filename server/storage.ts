import { type User, type SafeUser, type InsertUser, type ConsentSession, type InsertConsentSession, type VideoAsset, type InsertVideoAsset, users, consentSessions, videoAssets } from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId: string, subscriptionPlan: string, subscriptionStatus: string): Promise<User | undefined>;
  updateUserSubscriptionStatus(userId: string, status: string): Promise<User | undefined>;
  scheduleAccountDeletion(userId: string, deletionDate: Date, subscriptionEndDate: Date): Promise<User | undefined>;
  deleteUserAccount(userId: string): Promise<void>;
  
  // Consent session management
  createConsentSession(session: InsertConsentSession): Promise<ConsentSession>;
  getConsentSession(id: string): Promise<ConsentSession | undefined>;
  getConsentSessionByQrCode(qrCodeId: string): Promise<ConsentSession | undefined>;
  updateConsentSessionStatus(id: string, status: "pending" | "granted" | "denied" | "revoked", videoAssetId?: string): Promise<ConsentSession | undefined>;
  updateConsentVerification(id: string, buttonChoice: "granted" | "denied", aiAnalysisResult: string, hasAudioMismatch: boolean): Promise<ConsentSession | undefined>;
  updateAiAnalysisResult(id: string, aiAnalysisResult: string): Promise<ConsentSession | undefined>;
  
  // Video asset management  
  createVideoAsset(asset: InsertVideoAsset): Promise<VideoAsset>;
  getVideoAsset(id: string): Promise<VideoAsset | undefined>;
  updateVideoTranscript(id: string, transcript: string, confidence: number): Promise<VideoAsset | undefined>;
  
  // Upload URL generation (for secure video uploads)
  generateUploadUrl(filename: string, mimeType: string): Promise<{ uploadUrl: string; storageKey: string }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private consentSessions: Map<string, ConsentSession>;
  private videoAssets: Map<string, VideoAsset>;

  constructor() {
    this.users = new Map();
    this.consentSessions = new Map();
    this.videoAssets = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      fullName: insertUser.fullName || null,
      phoneNumber: insertUser.phoneNumber || null,
      profilePicture: insertUser.profilePicture || null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionStatus: null,
      subscriptionPlan: null,
      subscriptionEndDate: null,
      accountDeletionDate: null,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId: string, subscriptionPlan: string, subscriptionStatus: string): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      stripeCustomerId,
      stripeSubscriptionId,
      subscriptionPlan,
      subscriptionStatus,
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async updateUserSubscriptionStatus(userId: string, status: string): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      subscriptionStatus: status,
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async scheduleAccountDeletion(userId: string, deletionDate: Date, subscriptionEndDate: Date): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      accountDeletionDate: deletionDate,
      subscriptionEndDate: subscriptionEndDate,
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async deleteUserAccount(userId: string): Promise<void> {
    this.users.delete(userId);
    
    // Delete all consent sessions for this user
    for (const [sessionId, session] of this.consentSessions.entries()) {
      if (session.initiatorUserId === userId) {
        this.consentSessions.delete(sessionId);
      }
    }
  }

  // Consent session methods
  async createConsentSession(insertSession: InsertConsentSession): Promise<ConsentSession> {
    const id = randomUUID();
    const now = new Date();
    // Calculate retentionUntil from deleteAfterDays (default to 90 days if not provided)
    const deleteAfterDays = insertSession.deleteAfterDays || 90;
    const retentionUntil = new Date(now.getTime() + (deleteAfterDays * 24 * 60 * 60 * 1000));
    
    const session: ConsentSession = {
      id,
      initiatorUserId: insertSession.initiatorUserId,
      participantName: insertSession.participantName,
      participantPhone: insertSession.participantPhone || null,
      participantAge: insertSession.participantAge,
      consentStatus: insertSession.consentStatus || "pending",
      qrCodeId: insertSession.qrCodeId,
      videoAssetId: insertSession.videoAssetId || null,
      deleteAfterDays,
      sessionStartTime: now,
      consentGrantedTime: null,
      consentRevokedTime: null,
      retentionUntil,
      verificationStatus: "pending",
      aiAnalysisResult: null,
      hasAudioMismatch: false,
      verifiedAt: null,
      buttonChoice: null,
    };
    
    this.consentSessions.set(id, session);
    return session;
  }

  async getConsentSession(id: string): Promise<(ConsentSession & { initiator?: SafeUser }) | undefined> {
    const session = this.consentSessions.get(id);
    if (!session) return undefined;
    
    // Include only safe initiator information (no password/username)
    const initiatorUser = await this.getUser(session.initiatorUserId);
    const initiator: SafeUser | undefined = initiatorUser ? {
      id: initiatorUser.id,
      fullName: initiatorUser.fullName,
      profilePicture: initiatorUser.profilePicture,
      phoneNumber: initiatorUser.phoneNumber
    } : undefined;
    
    return {
      ...session,
      initiator
    };
  }

  async getConsentSessionByQrCode(qrCodeId: string): Promise<(ConsentSession & { initiator?: SafeUser }) | undefined> {
    const session = Array.from(this.consentSessions.values()).find(
      session => session.qrCodeId === qrCodeId
    );
    
    if (!session) return undefined;
    
    // Include only safe initiator information (no password/username)
    const initiatorUser = await this.getUser(session.initiatorUserId);
    const initiator: SafeUser | undefined = initiatorUser ? {
      id: initiatorUser.id,
      fullName: initiatorUser.fullName,
      profilePicture: initiatorUser.profilePicture,
      phoneNumber: initiatorUser.phoneNumber
    } : undefined;
    
    return {
      ...session,
      initiator
    };
  }

  async updateConsentSessionStatus(
    id: string, 
    status: "pending" | "granted" | "denied" | "revoked", 
    videoAssetId?: string
  ): Promise<ConsentSession | undefined> {
    const session = this.consentSessions.get(id);
    if (!session) return undefined;

    const now = new Date();
    const updatedSession: ConsentSession = {
      ...session,
      consentStatus: status,
      videoAssetId: videoAssetId || session.videoAssetId,
    };

    if (status === "granted") {
      updatedSession.consentGrantedTime = now;
    } else if (status === "revoked") {
      updatedSession.consentRevokedTime = now;
    }

    this.consentSessions.set(id, updatedSession);
    return updatedSession;
  }

  // Video asset methods
  async createVideoAsset(insertAsset: InsertVideoAsset): Promise<VideoAsset> {
    const id = randomUUID();
    const videoAsset: VideoAsset = {
      id,
      filename: insertAsset.filename,
      originalName: insertAsset.originalName || null,
      mimeType: insertAsset.mimeType,
      fileSize: insertAsset.fileSize,
      duration: insertAsset.duration || null,
      resolution: insertAsset.resolution || null,
      storageKey: insertAsset.storageKey,
      isEncrypted: insertAsset.isEncrypted !== undefined ? insertAsset.isEncrypted : true,
      checksum: insertAsset.checksum || null,
      uploadedAt: new Date(),
      transcript: null,
      transcriptionConfidence: null,
      transcribedAt: null,
    };

    this.videoAssets.set(id, videoAsset);
    return videoAsset;
  }

  async getVideoAsset(id: string): Promise<VideoAsset | undefined> {
    return this.videoAssets.get(id);
  }

  async updateVideoTranscript(id: string, transcript: string, confidence: number): Promise<VideoAsset | undefined> {
    const videoAsset = this.videoAssets.get(id);
    if (!videoAsset) return undefined;

    const updatedAsset: VideoAsset = {
      ...videoAsset,
      transcript,
      transcriptionConfidence: confidence,
      transcribedAt: new Date(),
    };

    this.videoAssets.set(id, updatedAsset);
    return updatedAsset;
  }

  async updateConsentVerification(
    id: string, 
    buttonChoice: "granted" | "denied", 
    aiAnalysisResult: string, 
    hasAudioMismatch: boolean
  ): Promise<ConsentSession | undefined> {
    const session = this.consentSessions.get(id);
    if (!session) return undefined;

    const updatedSession: ConsentSession = {
      ...session,
      buttonChoice,
      aiAnalysisResult,
      hasAudioMismatch,
      verificationStatus: hasAudioMismatch ? "mismatch" : "verified",
      verifiedAt: new Date(),
    };

    this.consentSessions.set(id, updatedSession);
    return updatedSession;
  }

  async updateAiAnalysisResult(id: string, aiAnalysisResult: string): Promise<ConsentSession | undefined> {
    const session = this.consentSessions.get(id);
    if (!session) return undefined;

    const updatedSession: ConsentSession = {
      ...session,
      aiAnalysisResult,
      // Don't update verification status or other fields - just store the AI result
    };

    this.consentSessions.set(id, updatedSession);
    return updatedSession;
  }

  // Upload URL generation (mock implementation for development)
  async generateUploadUrl(filename: string, mimeType: string): Promise<{ uploadUrl: string; storageKey: string }> {
    // In production, this would generate a pre-signed URL to object storage
    // For development/demo, we'll return a mock upload endpoint
    const storageKey = `consent-videos/${randomUUID()}-${filename}`;
    const uploadUrl = `/api/upload/${encodeURIComponent(storageKey)}`;
    
    return { uploadUrl, storageKey };
  }
}

// PostgreSQL Storage Implementation
export class PostgresStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    const sql = neon(process.env.DATABASE_URL);
    this.db = drizzle(sql);
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values([insertUser]).returning();
    return result[0];
  }

  async updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId: string, subscriptionPlan: string, subscriptionStatus: string): Promise<User | undefined> {
    const result = await this.db
      .update(users)
      .set({ 
        stripeCustomerId, 
        stripeSubscriptionId,
        subscriptionPlan,
        subscriptionStatus
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  async updateUserSubscriptionStatus(userId: string, status: string): Promise<User | undefined> {
    const result = await this.db
      .update(users)
      .set({ subscriptionStatus: status })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  async scheduleAccountDeletion(userId: string, deletionDate: Date, subscriptionEndDate: Date): Promise<User | undefined> {
    const result = await this.db
      .update(users)
      .set({ 
        accountDeletionDate: deletionDate,
        subscriptionEndDate: subscriptionEndDate
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  async deleteUserAccount(userId: string): Promise<void> {
    // Delete all consent sessions for this user
    await this.db.delete(consentSessions).where(eq(consentSessions.initiatorUserId, userId));
    
    // Delete the user
    await this.db.delete(users).where(eq(users.id, userId));
  }

  async createConsentSession(session: InsertConsentSession): Promise<ConsentSession> {
    // Calculate retention date from deleteAfterDays
    const retentionUntil = new Date(Date.now() + ((session.deleteAfterDays || 90) * 24 * 60 * 60 * 1000));
    
    const sessionWithRetention = {
      ...session,
      retentionUntil
    };
    
    const result = await this.db.insert(consentSessions).values([sessionWithRetention]).returning();
    return result[0];
  }

  async getConsentSession(id: string): Promise<ConsentSession | undefined> {
    const result = await this.db.select().from(consentSessions).where(eq(consentSessions.id, id)).limit(1);
    return result[0];
  }

  async getConsentSessionByQrCode(qrCodeId: string): Promise<ConsentSession | undefined> {
    const result = await this.db.select({
      session: consentSessions,
      initiator: users
    }).from(consentSessions)
    .leftJoin(users, eq(consentSessions.initiatorUserId, users.id))
    .where(eq(consentSessions.qrCodeId, qrCodeId)).limit(1);
    
    if (result[0]) {
      return {
        ...result[0].session,
        initiator: result[0].initiator ? {
          id: result[0].initiator.id,
          fullName: result[0].initiator.fullName,
          profilePicture: result[0].initiator.profilePicture,
          phoneNumber: result[0].initiator.phoneNumber
        } : undefined
      } as any;
    }
    
    return undefined;
  }

  async updateConsentSessionStatus(id: string, status: "pending" | "granted" | "denied" | "revoked", videoAssetId?: string): Promise<ConsentSession | undefined> {
    const updateData: any = { consentStatus: status };
    if (videoAssetId) {
      updateData.videoAssetId = videoAssetId;
    }
    if (status === "granted") {
      updateData.consentGrantedTime = new Date();
    } else if (status === "revoked") {
      updateData.consentRevokedTime = new Date();
    }

    const result = await this.db.update(consentSessions)
      .set(updateData)
      .where(eq(consentSessions.id, id))
      .returning();
    return result[0];
  }

  async updateConsentVerification(id: string, buttonChoice: "granted" | "denied", aiAnalysisResult: string, hasAudioMismatch: boolean): Promise<ConsentSession | undefined> {
    const result = await this.db.update(consentSessions)
      .set({
        buttonChoice,
        aiAnalysisResult,
        hasAudioMismatch,
        verificationStatus: hasAudioMismatch ? "mismatch" : "verified",
        verifiedAt: new Date(),
      })
      .where(eq(consentSessions.id, id))
      .returning();
    return result[0];
  }

  async updateAiAnalysisResult(id: string, aiAnalysisResult: string): Promise<ConsentSession | undefined> {
    const result = await this.db.update(consentSessions)
      .set({ aiAnalysisResult })
      .where(eq(consentSessions.id, id))
      .returning();
    return result[0];
  }

  async createVideoAsset(asset: InsertVideoAsset): Promise<VideoAsset> {
    const result = await this.db.insert(videoAssets).values([asset]).returning();
    return result[0];
  }

  async getVideoAsset(id: string): Promise<VideoAsset | undefined> {
    const result = await this.db.select().from(videoAssets).where(eq(videoAssets.id, id)).limit(1);
    return result[0];
  }

  async updateVideoTranscript(id: string, transcript: string, confidence: number): Promise<VideoAsset | undefined> {
    const result = await this.db.update(videoAssets)
      .set({
        transcript,
        transcriptionConfidence: confidence,
        transcribedAt: new Date(),
      })
      .where(eq(videoAssets.id, id))
      .returning();
    return result[0];
  }

  async generateUploadUrl(filename: string, mimeType: string): Promise<{ uploadUrl: string; storageKey: string }> {
    // For development/demo, we'll return a mock upload endpoint
    // In production, this would generate a pre-signed URL to object storage
    const storageKey = `consent-videos/${randomUUID()}-${filename}`;
    const uploadUrl = `/api/upload/${encodeURIComponent(storageKey)}`;
    
    return { uploadUrl, storageKey };
  }
}

export const storage = new PostgresStorage();

import { type User, type SafeUser, type InsertUser, type ConsentSession, type InsertConsentSession, type VideoAsset, type InsertVideoAsset } from "@shared/schema";
import { randomUUID } from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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
    };
    this.users.set(id, user);
    return user;
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

export const storage = new MemStorage();

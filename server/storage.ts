import { type User, type SafeUser, type InsertUser, type ConsentSession, type InsertConsentSession, type VideoAsset, type InsertVideoAsset } from "@shared/schema";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY');
}

export const supabase = createClient(
  'https://fvnvmdhvtbvtcfnrobsm.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<User | undefined>;
  updateUserProfilePictureUrl(userId: string, profilePictureUrl: string): Promise<User | undefined>;
  updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId: string, subscriptionPlan: string, subscriptionStatus: string): Promise<User | undefined>;
  updateUserSubscriptionStatus(userId: string, status: string): Promise<User | undefined>;
  scheduleAccountDeletion(userId: string, deletionDate: Date, subscriptionEndDate: Date): Promise<User | undefined>;
  deleteUserAccount(userId: string): Promise<void>;
  getUsersScheduledForDeletion(): Promise<User[]>;
  
  // Consent session management
  createConsentSession(session: InsertConsentSession): Promise<ConsentSession>;
  getConsentSession(id: string): Promise<ConsentSession | undefined>;
  getConsentSessionByQrCode(qrCodeId: string): Promise<ConsentSession | undefined>;
  updateConsentSessionStatus(id: string, status: "pending" | "granted" | "denied" | "revoked", videoAssetId?: string): Promise<ConsentSession | undefined>;
  updateConsentVerification(id: string, buttonChoice: "granted" | "denied", aiAnalysisResult: string, hasAudioMismatch: boolean): Promise<ConsentSession | undefined>;
  updateAiAnalysisResult(id: string, aiAnalysisResult: string): Promise<ConsentSession | undefined>;
  updateConsentTranscript(id: string, aiTranscript: string): Promise<ConsentSession | undefined>;
  
  // Video asset management  
  createVideoAsset(asset: InsertVideoAsset): Promise<VideoAsset>;
  getVideoAsset(id: string): Promise<VideoAsset | undefined>;
  updateVideoTranscript(id: string, transcript: string, confidence: number): Promise<VideoAsset | undefined>;
  updateVideoAssetUrl(id: string, storageUrl: string): Promise<VideoAsset | undefined>;
  
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
      profilePictureUrl: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionStatus: null,
      subscriptionPlan: null,
      subscriptionEndDate: null,
      accountDeletionDate: null,
      role: 'user',
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      password: hashedPassword,
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async updateUserProfilePictureUrl(userId: string, profilePictureUrl: string): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      profilePictureUrl,
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
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
    for (const [sessionId, session] of Array.from(this.consentSessions.entries())) {
      if (session.initiatorUserId === userId) {
        this.consentSessions.delete(sessionId);
      }
    }
  }

  async getUsersScheduledForDeletion(): Promise<User[]> {
    const now = new Date();
    return Array.from(this.users.values()).filter(user => {
      if (!user.accountDeletionDate) return false;
      const deletionDate = new Date(user.accountDeletionDate);
      return deletionDate <= now;
    });
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
      aiTranscript: null,
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
      profilePictureUrl: initiatorUser.profilePictureUrl,
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
      profilePictureUrl: initiatorUser.profilePictureUrl,
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
      storageUrl: null,
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

  async updateVideoAssetUrl(id: string, storageUrl: string): Promise<VideoAsset | undefined> {
    const videoAsset = this.videoAssets.get(id);
    if (!videoAsset) return undefined;

    const updatedAsset: VideoAsset = {
      ...videoAsset,
      storageUrl,
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

  async updateConsentTranscript(id: string, aiTranscript: string): Promise<ConsentSession | undefined> {
    const session = this.consentSessions.get(id);
    if (!session) return undefined;

    const updatedSession: ConsentSession = {
      ...session,
      aiTranscript,
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

// Supabase Storage Implementation
export class PostgresStorage implements IStorage {
  constructor() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required");
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) return undefined;
    return data as User;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .single();
    
    if (error) return undefined;
    return data as User;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
      console.log('Creating user with username:', insertUser.username);
      
      const { data, error } = await supabase
        .from("users")
        .insert([{
          username: insertUser.username,
          password: insertUser.password,
          full_name: insertUser.fullName,
          phone_number: insertUser.phoneNumber,
          profile_picture: insertUser.profilePicture
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Supabase createUser error:', JSON.stringify(error, null, 2));
        throw new Error(`Database insert failed: ${error.message || JSON.stringify(error)}`);
      }
      return data as User;
    } catch (err: any) {
      console.error('createUser exception:', err);
      console.error('Exception type:', err.constructor.name);
      console.error('Exception message:', err.message);
      console.error('Exception stack:', err.stack);
      throw new Error(`Database insert failed: ${err}`);
    }
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from("users")
      .update({ password: hashedPassword })
      .eq("id", userId)
      .select()
      .single();
    
    if (error) {
      console.error('updateUserPassword error:', error);
      return undefined;
    }
    return data as User;
  }

  async updateUserProfilePictureUrl(userId: string, profilePictureUrl: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from("users")
      .update({ profile_picture_url: profilePictureUrl })
      .eq("id", userId)
      .select()
      .single();
    
    if (error) return undefined;
    return data as User;
  }

  async updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId: string, subscriptionPlan: string, subscriptionStatus: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from("users")
      .update({ 
        stripe_customer_id: stripeCustomerId, 
        stripe_subscription_id: stripeSubscriptionId,
        subscription_plan: subscriptionPlan,
        subscription_status: subscriptionStatus
      })
      .eq("id", userId)
      .select()
      .single();
    
    if (error) return undefined;
    return data as User;
  }

  async updateUserSubscriptionStatus(userId: string, status: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from("users")
      .update({ subscription_status: status })
      .eq("id", userId)
      .select()
      .single();
    
    if (error) return undefined;
    return data as User;
  }

  async scheduleAccountDeletion(userId: string, deletionDate: Date, subscriptionEndDate: Date): Promise<User | undefined> {
    const { data, error } = await supabase
      .from("users")
      .update({ 
        account_deletion_date: deletionDate.toISOString(),
        subscription_end_date: subscriptionEndDate.toISOString()
      })
      .eq("id", userId)
      .select()
      .single();
    
    if (error) return undefined;
    return data as User;
  }

  async deleteUserAccount(userId: string): Promise<void> {
    // Delete all consent sessions for this user
    await supabase
      .from("consent_sessions")
      .delete()
      .eq("initiator_user_id", userId);
    
    // Delete the user
    await supabase
      .from("users")
      .delete()
      .eq("id", userId);
  }

  async getUsersScheduledForDeletion(): Promise<User[]> {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .not("account_deletion_date", "is", null)
      .lte("account_deletion_date", now);
    
    if (error) return [];
    return data as User[];
  }

  async createConsentSession(session: InsertConsentSession): Promise<ConsentSession> {
    // Calculate retention date from deleteAfterDays
    const retentionUntil = new Date(Date.now() + ((session.deleteAfterDays || 90) * 24 * 60 * 60 * 1000));
    
    const sessionWithRetention = {
      ...session,
      retention_until: retentionUntil.toISOString()
    };
    
    const { data, error } = await supabase
      .from("consent_sessions")
      .insert([sessionWithRetention])
      .select()
      .single();
    
    if (error) throw error;
    return data as ConsentSession;
  }

  async getConsentSession(id: string): Promise<ConsentSession | undefined> {
    const { data, error } = await supabase
      .from("consent_sessions")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) return undefined;
    return data as ConsentSession;
  }

  async getConsentSessionByQrCode(qrCodeId: string): Promise<ConsentSession | undefined> {
    const { data, error } = await supabase
      .from("consent_sessions")
      .select(`
        *,
        initiator:users!initiator_user_id (
          id,
          full_name,
          profile_picture_url,
          phone_number
        )
      `)
      .eq("qr_code_id", qrCodeId)
      .single();
    
    if (error) return undefined;
    return data as any;
  }

  async updateConsentSessionStatus(id: string, status: "pending" | "granted" | "denied" | "revoked", videoAssetId?: string): Promise<ConsentSession | undefined> {
    const updateData: any = { consent_status: status };
    if (videoAssetId) {
      updateData.video_asset_id = videoAssetId;
    }
    if (status === "granted") {
      updateData.consent_granted_time = new Date().toISOString();
    } else if (status === "revoked") {
      updateData.consent_revoked_time = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("consent_sessions")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();
    
    if (error) return undefined;
    return data as ConsentSession;
  }

  async updateConsentVerification(id: string, buttonChoice: "granted" | "denied", aiAnalysisResult: string, hasAudioMismatch: boolean): Promise<ConsentSession | undefined> {
    const { data, error } = await supabase
      .from("consent_sessions")
      .update({
        button_choice: buttonChoice,
        ai_analysis_result: aiAnalysisResult,
        has_audio_mismatch: hasAudioMismatch,
        verification_status: hasAudioMismatch ? "mismatch" : "verified",
        verified_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    
    if (error) return undefined;
    return data as ConsentSession;
  }

  async updateAiAnalysisResult(id: string, aiAnalysisResult: string): Promise<ConsentSession | undefined> {
    const { data, error } = await supabase
      .from("consent_sessions")
      .update({ ai_analysis_result: aiAnalysisResult })
      .eq("id", id)
      .select()
      .single();
    
    if (error) return undefined;
    return data as ConsentSession;
  }

  async updateConsentTranscript(id: string, aiTranscript: string): Promise<ConsentSession | undefined> {
    const { data, error } = await supabase
      .from("consent_sessions")
      .update({ ai_transcript: aiTranscript })
      .eq("id", id)
      .select()
      .single();
    
    if (error) return undefined;
    return data as ConsentSession;
  }

  async createVideoAsset(asset: InsertVideoAsset): Promise<VideoAsset> {
    const { data, error } = await supabase
      .from("video_assets")
      .insert([asset])
      .select()
      .single();
    
    if (error) throw error;
    return data as VideoAsset;
  }

  async getVideoAsset(id: string): Promise<VideoAsset | undefined> {
    const { data, error } = await supabase
      .from("video_assets")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) return undefined;
    return data as VideoAsset;
  }

  async updateVideoTranscript(id: string, transcript: string, confidence: number): Promise<VideoAsset | undefined> {
    const { data, error } = await supabase
      .from("video_assets")
      .update({
        transcript,
        transcription_confidence: confidence,
        transcribed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    
    if (error) return undefined;
    return data as VideoAsset;
  }

  async updateVideoAssetUrl(id: string, storageUrl: string): Promise<VideoAsset | undefined> {
    const { data, error } = await supabase
      .from("video_assets")
      .update({ storage_url: storageUrl })
      .eq("id", id)
      .select()
      .single();
    
    if (error) return undefined;
    return data as VideoAsset;
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

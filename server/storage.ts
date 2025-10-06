import { type User, type SafeUser, type InsertUser, type ConsentSession, type InsertConsentSession, type VideoAsset, type InsertVideoAsset } from "@shared/schema";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

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
    
    // Fetch user's full name and profile picture for denormalized storage
    const user = await this.getUser(insertSession.initiatorUserId);
    const initiatorFullName = user?.fullName || null;
    const initiatorProfilePictureUrl = user?.profilePictureUrl || null;
    
    // Calculate retentionUntil from deleteAfterDays (null = keep indefinitely)
    const deleteAfterDays = insertSession.deleteAfterDays ?? null;
    const retentionUntil = deleteAfterDays ? new Date(now.getTime() + (deleteAfterDays * 24 * 60 * 60 * 1000)) : null;
    
    const session: ConsentSession = {
      id,
      createdAt: now,
      initiatorUserId: insertSession.initiatorUserId,
      initiatorFullName,
      initiatorProfilePictureUrl,
      recipientFullName: insertSession.recipientFullName,
      recipientPhone: insertSession.recipientPhone || null,
      verifiedOver18: insertSession.verifiedOver18 ?? true,
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
    
    // If a video asset is being linked, populate its owner fields from the consent session initiator
    if (videoAssetId) {
      const videoAsset = this.videoAssets.get(videoAssetId);
      const user = await this.getUser(session.initiatorUserId);
      if (videoAsset && user) {
        const updatedAsset: VideoAsset = {
          ...videoAsset,
          ownerUserId: session.initiatorUserId,
          ownerFullName: user.fullName
        };
        this.videoAssets.set(videoAssetId, updatedAsset);
      }
    }
    
    return updatedSession;
  }

  // Video asset methods
  async createVideoAsset(insertAsset: InsertVideoAsset): Promise<VideoAsset> {
    const id = randomUUID();
    const videoAsset: VideoAsset = {
      id,
      ownerUserId: insertAsset.ownerUserId || null,
      ownerFullName: insertAsset.ownerFullName || null,
      filename: insertAsset.filename,
      originalName: insertAsset.originalName || null,
      mimeType: insertAsset.mimeType,
      fileSize: insertAsset.fileSize,
      duration: insertAsset.duration || null,
      resolution: insertAsset.resolution || null,
      storageKey: insertAsset.storageKey,
      storageUrl: insertAsset.storageUrl || null,
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
// Helper functions to map database fields
function mapUserFromDb(data: any): User {
  return {
    id: data.id,
    username: data.username,
    password: data.password,
    fullName: data.full_name,
    phoneNumber: data.phone_number,
    profilePicture: data.profile_picture,
    profilePictureUrl: data.profile_picture_url,
    stripeCustomerId: data.stripe_customer_id,
    stripeSubscriptionId: data.stripe_subscription_id,
    subscriptionStatus: data.subscription_status,
    subscriptionPlan: data.subscription_plan,
    subscriptionEndDate: data.subscription_end_date,
    accountDeletionDate: data.account_deletion_date,
    role: data.role
  } as User;
}

function mapVideoAssetFromDb(data: any): VideoAsset {
  return {
    id: data.id,
    ownerUserId: data.owner_user_id,
    ownerFullName: data.owner_full_name,
    filename: data.filename,
    originalName: data.original_name,
    mimeType: data.mime_type,
    fileSize: data.file_size,
    duration: data.duration,
    resolution: data.resolution,
    storageKey: data.storage_key,
    storageUrl: data.storage_url,
    uploadedAt: data.uploaded_at,
    isEncrypted: data.is_encrypted,
    checksum: data.checksum,
    transcript: data.transcript,
    transcriptionConfidence: data.transcription_confidence,
    transcribedAt: data.transcribed_at
  } as VideoAsset;
}

function mapConsentSessionFromDb(data: any): ConsentSession {
  return {
    id: data.id,
    createdAt: data.created_at,
    qrCodeId: data.qr_code_id,
    initiatorUserId: data.initiator_user_id,
    initiatorFullName: data.initiator_full_name,
    initiatorProfilePictureUrl: data.initiator_profile_picture_url,
    recipientFullName: data.recipient_full_name,
    recipientPhone: data.recipient_phone,
    verifiedOver18: data.verified_over_18,
    consentStatus: data.consent_status,
    videoAssetId: data.video_asset_id,
    deleteAfterDays: data.delete_after_days,
    sessionStartTime: data.session_start_time,
    consentGrantedTime: data.consent_granted_time,
    consentRevokedTime: data.consent_revoked_time,
    retentionUntil: data.retention_until,
    verificationStatus: data.verification_status,
    aiAnalysisResult: data.ai_analysis_result,
    aiTranscript: data.ai_transcript,
    hasAudioMismatch: data.has_audio_mismatch,
    verifiedAt: data.verified_at,
    buttonChoice: data.button_choice
  } as ConsentSession;
}

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
    
    // Map snake_case columns to camelCase properties
    return {
      id: data.id,
      username: data.username,
      password: data.password,
      fullName: data.full_name,
      phoneNumber: data.phone_number,
      profilePicture: data.profile_picture,
      stripeCustomerId: data.stripe_customer_id,
      stripeSubscriptionId: data.stripe_subscription_id,
      subscriptionStatus: data.subscription_status,
      subscriptionPlan: data.subscription_plan,
      subscriptionEndDate: data.subscription_end_date,
      accountDeletionDate: data.account_deletion_date,
      role: data.role
    } as User;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .single();
    
    if (error) return undefined;
    
    // Map snake_case columns to camelCase properties
    return {
      id: data.id,
      username: data.username,
      password: data.password,
      fullName: data.full_name,
      phoneNumber: data.phone_number,
      profilePicture: data.profile_picture,
      stripeCustomerId: data.stripe_customer_id,
      stripeSubscriptionId: data.stripe_subscription_id,
      subscriptionStatus: data.subscription_status,
      subscriptionPlan: data.subscription_plan,
      subscriptionEndDate: data.subscription_end_date,
      accountDeletionDate: data.account_deletion_date,
      role: data.role
    } as User;
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
      return mapUserFromDb(data);
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
    return mapUserFromDb(data);
  }

  async updateUserProfilePictureUrl(userId: string, profilePictureUrl: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from("users")
      .update({ profile_picture_url: profilePictureUrl })
      .eq("id", userId)
      .select()
      .single();
    
    if (error) return undefined;
    return mapUserFromDb(data);
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
    return mapUserFromDb(data);
  }

  async updateUserSubscriptionStatus(userId: string, status: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from("users")
      .update({ subscription_status: status })
      .eq("id", userId)
      .select()
      .single();
    
    if (error) return undefined;
    return mapUserFromDb(data);
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
    return mapUserFromDb(data);
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
    return data.map(mapUserFromDb);
  }

  async createConsentSession(session: InsertConsentSession): Promise<ConsentSession> {
    // Fetch user's full name and profile picture for denormalized storage
    const user = await this.getUser(session.initiatorUserId);
    const initiatorFullName = user?.fullName || null;
    const initiatorProfilePictureUrl = user?.profilePictureUrl || null;
    
    // Calculate retention date from deleteAfterDays (null = keep indefinitely)
    const deleteAfterDays = session.deleteAfterDays ?? null;
    const retentionUntil = deleteAfterDays ? new Date(Date.now() + (deleteAfterDays * 24 * 60 * 60 * 1000)) : null;
    
    // Map camelCase to snake_case for database
    const dbSession = {
      qr_code_id: session.qrCodeId,
      initiator_user_id: session.initiatorUserId,
      initiator_full_name: initiatorFullName,
      initiator_profile_picture_url: initiatorProfilePictureUrl,
      recipient_full_name: session.recipientFullName,
      recipient_phone: session.recipientPhone || null,
      verified_over_18: session.verifiedOver18,
      consent_status: session.consentStatus || 'pending',
      video_asset_id: session.videoAssetId || null,
      delete_after_days: deleteAfterDays,
      retention_until: retentionUntil ? retentionUntil.toISOString() : null
    };
    
    const { data, error } = await supabase
      .from("consent_sessions")
      .insert([dbSession])
      .select()
      .single();
    
    if (error) throw error;
    return mapConsentSessionFromDb(data);
  }

  async getConsentSession(id: string): Promise<ConsentSession | undefined> {
    const { data, error } = await supabase
      .from("consent_sessions")
      .select("*")
      .eq("id", id)
      .order("created_at", { ascending: false })
      .single();
    
    if (error) return undefined;
    return mapConsentSessionFromDb(data);
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
      .order("created_at", { ascending: false })
      .single();
    
    if (error) return undefined;
    
    // Map snake_case to camelCase with initiator info
    const session = mapConsentSessionFromDb(data);
    return {
      ...session,
      initiator: data.initiator ? {
        id: data.initiator.id,
        fullName: data.initiator.full_name,
        profilePictureUrl: data.initiator.profile_picture_url,
        phoneNumber: data.initiator.phone_number
      } : undefined
    } as any;
  }

  async getUserConsentSessions(userId: string): Promise<ConsentSession[]> {
    const { data, error } = await supabase
      .from("consent_sessions")
      .select("*")
      .eq("initiator_user_id", userId)
      .order("created_at", { ascending: false });
    
    if (error) return [];
    return data.map(mapConsentSessionFromDb);
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
    
    // If a video asset is being linked, populate its owner fields from the consent session initiator
    if (videoAssetId && data.initiator_user_id) {
      const user = await this.getUser(data.initiator_user_id);
      if (user) {
        await supabase
          .from("video_assets")
          .update({
            owner_user_id: data.initiator_user_id,
            owner_full_name: user.fullName
          })
          .eq("id", videoAssetId);
      }
    }
    
    return mapConsentSessionFromDb(data);
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
    return mapConsentSessionFromDb(data);
  }

  async updateAiAnalysisResult(id: string, aiAnalysisResult: string): Promise<ConsentSession | undefined> {
    const { data, error } = await supabase
      .from("consent_sessions")
      .update({ ai_analysis_result: aiAnalysisResult })
      .eq("id", id)
      .select()
      .single();
    
    if (error) return undefined;
    return mapConsentSessionFromDb(data);
  }

  async updateConsentTranscript(id: string, aiTranscript: string): Promise<ConsentSession | undefined> {
    const { data, error } = await supabase
      .from("consent_sessions")
      .update({ ai_transcript: aiTranscript })
      .eq("id", id)
      .select()
      .single();
    
    if (error) return undefined;
    return mapConsentSessionFromDb(data);
  }

  async createVideoAsset(asset: InsertVideoAsset): Promise<VideoAsset> {
    // Map camelCase to snake_case for database
    const dbAsset = {
      owner_user_id: asset.ownerUserId,
      owner_full_name: asset.ownerFullName,
      filename: asset.filename,
      original_name: asset.originalName,
      mime_type: asset.mimeType,
      file_size: asset.fileSize,
      duration: asset.duration,
      resolution: asset.resolution,
      storage_key: asset.storageKey,
      storage_url: asset.storageUrl,
      is_encrypted: asset.isEncrypted,
      checksum: asset.checksum,
      transcript: asset.transcript,
      transcription_confidence: asset.transcriptionConfidence,
      transcribed_at: asset.transcribedAt
    };
    
    const { data, error } = await supabase
      .from("video_assets")
      .insert([dbAsset])
      .select()
      .single();
    
    if (error) throw error;
    return mapVideoAssetFromDb(data);
  }

  async getVideoAsset(id: string): Promise<VideoAsset | undefined> {
    const { data, error } = await supabase
      .from("video_assets")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) return undefined;
    return mapVideoAssetFromDb(data);
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
    return mapVideoAssetFromDb(data);
  }

  async updateVideoAssetUrl(id: string, storageUrl: string): Promise<VideoAsset | undefined> {
    const { data, error } = await supabase
      .from("video_assets")
      .update({ storage_url: storageUrl })
      .eq("id", id)
      .select()
      .single();
    
    if (error) return undefined;
    return mapVideoAssetFromDb(data);
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

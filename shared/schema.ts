import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const consentStatusEnum = pgEnum("consent_status", ["pending", "granted", "denied", "revoked"]);
export const verificationStatusEnum = pgEnum("verification_status", ["pending", "verified", "mismatch", "unclear", "failed"]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name"),
  phoneNumber: text("phone_number"), 
  profilePicture: text("profile_picture"), // Base64 encoded image data (deprecated - use profilePictureUrl)
  profilePictureUrl: text("profile_picture_url"), // Supabase storage URL
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status"), // active, canceled, past_due, etc.
  subscriptionPlan: text("subscription_plan"), // monthly, annual
  subscriptionEndDate: timestamp("subscription_end_date"), // when subscription ends/ended
  accountDeletionDate: timestamp("account_deletion_date"), // scheduled deletion date (7 days after cancellation)
  role: text("role").notNull().default("user"), // user, admin
});

export const videoAssets = pgTable("video_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerUserId: varchar("owner_user_id").references(() => users.id),
  ownerFullName: text("owner_full_name"),
  filename: text("filename").notNull(),
  originalName: text("original_name"),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  duration: integer("duration"), // in seconds
  resolution: text("resolution"), // e.g., "1280x720"
  storageKey: text("storage_key").notNull(), // key in object storage (local path - deprecated)
  storageUrl: text("storage_url"), // Supabase storage URL
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  isEncrypted: boolean("is_encrypted").notNull().default(true),
  checksum: text("checksum"), // for integrity verification
  transcript: text("transcript"), // speech-to-text result
  transcriptionConfidence: integer("transcription_confidence"), // 0-100 confidence score (scaled from 0-1)
  transcribedAt: timestamp("transcribed_at"),
});

export const consentSessions = pgTable("consent_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  initiatorUserId: varchar("initiator_user_id").notNull().references(() => users.id),
  initiatorFullName: text("initiator_full_name"),
  initiatorProfilePictureUrl: text("initiator_profile_picture_url"),
  recipientFullName: text("recipient_full_name").notNull(),
  recipientPhone: text("recipient_phone"),
  verifiedOver18: boolean("verified_over_18").notNull().default(true),
  consentStatus: consentStatusEnum("consent_status").notNull().default("pending"),
  sessionStartTime: timestamp("session_start_time").defaultNow().notNull(),
  consentGrantedTime: timestamp("consent_granted_time"),
  consentRevokedTime: timestamp("consent_revoked_time"),
  qrCodeId: text("qr_code_id").notNull(),
  videoAssetId: varchar("video_asset_id").references(() => videoAssets.id),
  retentionUntil: timestamp("retention_until"), // null = keep indefinitely
  deleteAfterDays: integer("delete_after_days"), // null = keep indefinitely, otherwise days until deletion
  verificationStatus: verificationStatusEnum("verification_status").notNull().default("pending"),
  aiAnalysisResult: text("ai_analysis_result"), // CONSENT_GRANTED, CONSENT_DENIED, UNCLEAR
  aiTranscript: text("ai_transcript"), // Full transcript text from AI speech-to-text
  hasAudioMismatch: boolean("has_audio_mismatch").default(false), // true if audio doesn't match button choice
  verifiedAt: timestamp("verified_at"),
  buttonChoice: text("button_choice"), // "granted" or "denied" - what user actually clicked
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  phoneNumber: true,
  profilePicture: true,
});

export const insertConsentSessionSchema = createInsertSchema(consentSessions).omit({
  id: true,
  createdAt: true,
  sessionStartTime: true,
  consentGrantedTime: true,
  consentRevokedTime: true,
  retentionUntil: true, // will be calculated from deleteAfterDays in backend
  initiatorUserId: true, // auto-injected from req.user
  qrCodeId: true, // auto-generated
}).extend({
  // initiatorUserId and qrCodeId will be auto-populated by backend
  // retentionUntil will be calculated: new Date(Date.now() + (deleteAfterDays * 24 * 60 * 60 * 1000))
});

export const insertVideoAssetSchema = createInsertSchema(videoAssets).omit({
  id: true,
  uploadedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type SafeUser = Pick<User, 'id' | 'fullName' | 'profilePicture' | 'profilePictureUrl' | 'phoneNumber'>; // No password or username
export type InsertConsentSession = z.infer<typeof insertConsentSessionSchema>;
export type ConsentSession = typeof consentSessions.$inferSelect;
export type InsertVideoAsset = z.infer<typeof insertVideoAssetSchema>;
export type VideoAsset = typeof videoAssets.$inferSelect;

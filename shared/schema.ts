import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const consentStatusEnum = pgEnum("consent_status", ["pending", "granted", "denied", "revoked"]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name"),
  phoneNumber: text("phone_number"), 
  profilePicture: text("profile_picture"), // Base64 encoded image data
});

export const videoAssets = pgTable("video_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: text("filename").notNull(),
  originalName: text("original_name"),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  duration: integer("duration"), // in seconds
  resolution: text("resolution"), // e.g., "1280x720"
  storageKey: text("storage_key").notNull(), // key in object storage
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  isEncrypted: boolean("is_encrypted").notNull().default(true),
  checksum: text("checksum"), // for integrity verification
});

export const consentSessions = pgTable("consent_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  initiatorUserId: varchar("initiator_user_id").notNull().references(() => users.id),
  participantName: text("participant_name").notNull(),
  participantPhone: text("participant_phone"),
  participantAge: integer("participant_age").notNull(),
  consentStatus: consentStatusEnum("consent_status").notNull().default("pending"),
  sessionStartTime: timestamp("session_start_time").defaultNow().notNull(),
  consentGrantedTime: timestamp("consent_granted_time"),
  consentRevokedTime: timestamp("consent_revoked_time"),
  qrCodeId: text("qr_code_id").notNull(),
  videoAssetId: varchar("video_asset_id").references(() => videoAssets.id),
  retentionUntil: timestamp("retention_until").notNull(), // must be calculated from deleteAfterDays
  deleteAfterDays: integer("delete_after_days").notNull().default(90), // configurable retention period
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
  sessionStartTime: true,
  consentGrantedTime: true,
  consentRevokedTime: true,
  retentionUntil: true, // will be calculated from deleteAfterDays in backend
}).extend({
  // retentionUntil will be calculated: new Date(Date.now() + (deleteAfterDays * 24 * 60 * 60 * 1000))
});

export const insertVideoAssetSchema = createInsertSchema(videoAssets).omit({
  id: true,
  uploadedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertConsentSession = z.infer<typeof insertConsentSessionSchema>;
export type ConsentSession = typeof consentSessions.$inferSelect;
export type InsertVideoAsset = z.infer<typeof insertVideoAssetSchema>;
export type VideoAsset = typeof videoAssets.$inferSelect;

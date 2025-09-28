// API functions for consent sessions and video assets
import { authenticatedFetch } from "./auth";
import type { ConsentSession, InsertConsentSession, VideoAsset, InsertVideoAsset } from "@shared/schema";

// Consent Session API functions
export const createConsentSession = async (sessionData: InsertConsentSession): Promise<ConsentSession> => {
  const response = await authenticatedFetch("/api/consent/sessions", {
    method: "POST",
    body: JSON.stringify(sessionData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to create consent session");
  }

  return response.json();
};

export const getConsentSession = async (id: string): Promise<ConsentSession> => {
  const response = await fetch(`/api/consent/sessions/${id}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to get consent session");
  }

  return response.json();
};

export const getConsentSessionByQR = async (qrCodeId: string): Promise<ConsentSession> => {
  const response = await fetch(`/api/consent/sessions/qr/${qrCodeId}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to get consent session");
  }

  return response.json();
};

export const updateConsentSessionStatus = async (
  id: string, 
  status: "pending" | "granted" | "denied" | "revoked", 
  videoAssetId?: string
): Promise<ConsentSession> => {
  const response = await authenticatedFetch(`/api/consent/sessions/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, videoAssetId }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to update consent session status");
  }

  return response.json();
};

// Video Asset API functions
export const generateUploadUrl = async (filename: string, mimeType: string): Promise<{ uploadUrl: string; storageKey: string }> => {
  const response = await authenticatedFetch("/api/video/upload-url", {
    method: "POST",
    body: JSON.stringify({ filename, mimeType }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to generate upload URL");
  }

  return response.json();
};

export const createVideoAsset = async (assetData: InsertVideoAsset): Promise<VideoAsset> => {
  const response = await authenticatedFetch("/api/video/assets", {
    method: "POST",
    body: JSON.stringify(assetData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to create video asset");
  }

  return response.json();
};

export const getVideoAsset = async (id: string): Promise<VideoAsset> => {
  const response = await authenticatedFetch(`/api/video/assets/${id}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to get video asset");
  }

  return response.json();
};
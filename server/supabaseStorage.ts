import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  const missingVars = [];
  if (!supabaseUrl) missingVars.push('SUPABASE_URL');
  if (!supabaseKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
  
  throw new Error(
    `Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL - the ${missingVars.join(' and ')} environment variable${missingVars.length > 1 ? 's are' : ' is'} missing or empty. ` +
    `Please add ${missingVars.length > 1 ? 'these secrets' : 'this secret'} to your deployment environment variables in the Replit Deployment settings.`
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function uploadConsentVideo(fileBuffer: Buffer, filename: string): Promise<string> {
  // Upload WITHOUT upsert to prevent overwriting existing videos
  const { data, error } = await supabase.storage
    .from('consent-videos')
    .upload(filename, fileBuffer, { upsert: false });
  
  if (error) {
    console.error('Supabase video upload error:', error);
    throw error;
  }
  
  return data.path;
}

export async function uploadProfilePicture(fileBuffer: Buffer, filename: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('profile-pictures')
    .upload(filename, fileBuffer, { upsert: true });
  
  if (error) {
    console.error('Supabase profile picture upload error:', error);
    throw error;
  }
  
  const { data: urlData } = supabase.storage
    .from('profile-pictures')
    .getPublicUrl(data.path);
  
  return urlData.publicUrl;
}

export async function getSignedVideoUrl(filepath: string, expiresIn: number = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from('consent-videos')
    .createSignedUrl(filepath, expiresIn);
  
  if (error) {
    console.error('Supabase signed URL error:', error);
    throw error;
  }
  
  return data.signedUrl;
}

export async function deleteConsentVideo(filepath: string): Promise<void> {
  const { error } = await supabase.storage
    .from('consent-videos')
    .remove([filepath]);
  
  if (error) {
    console.error('Supabase video deletion error:', error);
    throw error;
  }
}

export async function deleteProfilePicture(filepath: string): Promise<void> {
  const { error } = await supabase.storage
    .from('profile-pictures')
    .remove([filepath]);
  
  if (error) {
    console.error('Supabase profile picture deletion error:', error);
    throw error;
  }
}

export default supabase;

import { storage } from "./storage";
import { uploadProfilePicture } from "./supabaseStorage";

async function migrateProfilePicture() {
  try {
    const userId = '78fe8957-c26f-4f1e-8b23-f87f22ef4f58';
    
    // Get user with base64 profile picture
    const user = await storage.getUser(userId);
    
    if (!user) {
      console.log('User not found');
      return;
    }
    
    if (!user.profilePicture || !user.profilePicture.startsWith('data:image')) {
      console.log('No base64 profile picture to migrate');
      return;
    }
    
    console.log('Migrating profile picture for user:', user.username);
    
    // Extract base64 data from data URI
    const base64Data = user.profilePicture.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    const filename = `${user.id}-${Date.now()}.jpg`;
    
    // Upload to Supabase
    const profilePictureUrl = await uploadProfilePicture(buffer, filename);
    
    // Update user with Supabase URL
    await storage.updateUserProfilePictureUrl(user.id, profilePictureUrl);
    
    console.log(`✅ PROFILE PICTURE MIGRATED TO SUPABASE: ${profilePictureUrl}`);
    console.log(`User: ${user.username}`);
    console.log(`File size: ${buffer.length} bytes`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateProfilePicture();

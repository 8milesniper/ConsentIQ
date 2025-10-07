import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testConnection() {
  console.log('Testing Supabase connection...');
  
  // Try to insert with initiator_profile_picture_url
  const testData = {
    qr_code_id: 'test-' + Date.now(),
    initiator_user_id: 'f928f4ee-60ea-48db-99ca-a1ab99f18a81',
    initiator_full_name: 'Test User',
    initiator_profile_picture_url: 'https://example.com/pic.jpg',
    recipient_full_name: 'Test Recipient',
    consent_status: 'pending',
    verified_over_18: true
  };
  
  const { data, error } = await supabase
    .from('consent_sessions')
    .insert([testData])
    .select()
    .single();
  
  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Success! Session created:', data.id);
    // Clean up
    await supabase.from('consent_sessions').delete().eq('id', data.id);
  }
}

testConnection();

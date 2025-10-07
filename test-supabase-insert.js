import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fvnvmdhvtbvtcfnrobsm.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2bnZtZGh2dGJ2dGNmbnJvYnNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDc1MzAsImV4cCI6MjA3NDYyMzUzMH0.gK6u1VR6RfXnxXhACXMP-4AA9sytqfmxwSbIUn94zZY'
);

async function testInsert() {
  console.log('Testing Supabase insert to consent_sessions...\n');
  
  const testData = {
    qr_code_id: 'test-qr-' + Date.now(),
    initiator_user_id: 'f928f4ee-60ea-48db-99ca-a1a9e3746c73',
    recipient_full_name: 'Test Recipient',
    recipient_phone: '0400123456',
    verified_over_18: true,
    consent_status: 'pending'
  };
  
  console.log('Inserting data:', JSON.stringify(testData, null, 2));
  
  const { data, error } = await supabase
    .from('consent_sessions')
    .insert(testData)
    .select()
    .single();
  
  if (error) {
    console.error('\n❌ INSERT FAILED:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Full error:', JSON.stringify(error, null, 2));
  } else {
    console.log('\n✅ INSERT SUCCESS:');
    console.log('Session created:', JSON.stringify(data, null, 2));
  }
}

testInsert();

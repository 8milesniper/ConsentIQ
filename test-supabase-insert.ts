import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testInsert() {
  console.log('Testing direct Supabase insert...');
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
  
  const { data, error } = await supabase
    .from('users')
    .insert([{
      username: 'directtest@example.com',
      password: 'hashedpassword123',
      full_name: 'Direct Test User',
      phone_number: '555-9999'
    }])
    .select()
    .single();
  
  if (error) {
    console.error('ERROR:', JSON.stringify(error, null, 2));
    process.exit(1);
  }
  
  console.log('SUCCESS! Inserted user:', JSON.stringify(data, null, 2));
  
  // Clean up
  await supabase.from('users').delete().eq('id', data.id);
  console.log('Cleaned up test user');
}

testInsert();

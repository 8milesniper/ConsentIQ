import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  'https://fvnvmdhvtbvtcfnrobsm.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function test() {
  console.log('Testing CORRECT hardcoded URL...');
  
  const { data, error } = await supabase
    .from('users')
    .insert([{
      id: crypto.randomUUID(),
      username: 'hardcoded-test@example.com',
      password: 'test123',
      full_name: 'Hardcoded Test'
    }])
    .select()
    .single();
  
  if (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
  
  console.log('SUCCESS! User created:', data.id);
  
  // Cleanup
  await supabase.from('users').delete().eq('id', data.id);
  console.log('Cleaned up');
}

test();

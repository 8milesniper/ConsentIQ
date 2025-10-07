import { supabase } from './server/storage';

async function checkColumn() {
  const { error } = await supabase
    .from('consent_sessions')
    .select('initiator_profile_picture_url')
    .limit(1);
  
  if (error && error.code === 'PGRST204') {
    console.log('❌ Column initiator_profile_picture_url is MISSING');
  } else if (error) {
    console.log('Error:', error);
  } else {
    console.log('✅ Column exists');
  }
}

checkColumn();

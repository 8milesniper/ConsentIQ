import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkTriggers() {
  // Try to get triggers using RPC or direct query
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `SELECT trigger_name, event_manipulation, action_statement 
          FROM information_schema.triggers 
          WHERE event_object_table = 'consent_sessions'`
  });
  
  if (error) {
    console.log('Cannot query triggers via RPC:', error.message);
    console.log('\nManually check in Supabase Dashboard → Database → Triggers');
  } else {
    console.log('Triggers on consent_sessions:', data);
  }
}

checkTriggers();

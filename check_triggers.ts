import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function checkTriggers() {
  const triggers = await sql`
    SELECT 
      trigger_name,
      event_manipulation,
      event_object_table,
      action_statement
    FROM information_schema.triggers
    WHERE event_object_table = 'consent_sessions'
  `;
  
  console.log('Triggers on consent_sessions:', JSON.stringify(triggers, null, 2));
}

checkTriggers();

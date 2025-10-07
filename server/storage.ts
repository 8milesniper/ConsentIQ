import { createClient } from "@supabase/supabase-js";

// This connects your backend to Supabase storage and database
const storage = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Export the storage client so other files can import it
export { storage };

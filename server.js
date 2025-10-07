import express from 'express';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const supabase = createClient('https://fvnvmdhvtbvtcfnrobsm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2bnZtZGh2dGJ2dGNmbnJvYnNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDc1MzAsImV4cCI6MjA3NDYyMzUzMH0.gK6u1VR6RfXnxXhACXMP-4AA9sytqfmxwSbIUn94zZY');

app.post('/consent/new', async (req, res) => {
  try {
    const { video_asset_id_new, userId, recipient_full_name, recipient_phone } = req.body;
    const { data, error } = await supabase
      .from('consent_sessions')
      .insert({ qr_code_id: 'test-now', initiator_user_id: userId, consent_status: 'pending', video_asset_id_new, recipient_full_name, recipient_phone })
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, sessionId: data.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));

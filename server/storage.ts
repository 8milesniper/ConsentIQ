import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL as string
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string
export const supabase = createClient(supabaseUrl, supabaseKey)

// Insert a new consent session record
export async function saveConsentSession(sessionData: any) {
  const { data, error } = await supabase
    .from('consent_sessions')
    .insert([
      {
        initiator_user_id: sessionData.initiator_user_id,
        initiator_full_name: sessionData.initiator_full_name,
        initiator_phone: sessionData.initiator_phone,
        recipient_full_name: sessionData.recipient_full_name,
        recipient_phone: sessionData.recipient_phone,
        video_filename: sessionData.video_filename,
        video_storage_url: sessionData.video_storage_url,
        consent_status: sessionData.consent_status,
        verified_at: sessionData.verified_at,
        transcript: sessionData.transcript,
        transcription_confidence: sessionData.transcription_confidence,
        button_choice: sessionData.button_choice,
        verification_status: sessionData.verification_status,
        ai_analysis_result: sessionData.ai_analysis_result,
      },
    ])

  if (error) {
    console.error('Error saving consent session:', error)
    throw error
  }

  return data
}

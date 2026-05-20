import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ebynshesgxlmttesplge.supabase.co'
const supabaseKey = 'sb_publishable_orPb9K2klmH7SFuV4FRaNg_BOLyGp6-'

export const supabase = createClient(supabaseUrl, supabaseKey)

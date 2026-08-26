// Ejemplo en JavaScript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL // Tu Project URL
const supabaseKey = process.env.SUPABASE_ANON_KEY // Tu anon API Key

export const supabase = createClient(supabaseUrl, supabaseKey)

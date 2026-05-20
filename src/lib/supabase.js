import { createClient } from '@supabase/supabase-js'

// anon key is intentionally public — safe to hard-code as fallback
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://eazlfuygqdcauqdsarzy.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhemxmdXlncWRjYXVxZHNhcnp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMzMxMDAsImV4cCI6MjA5MzgwOTEwMH0.IuYnPpmRgQ_6lHGavdYaQjV2HN0jUcpZM44rAV5KRoA'

export const supabase = createClient(supabaseUrl, supabaseKey)
export default supabase

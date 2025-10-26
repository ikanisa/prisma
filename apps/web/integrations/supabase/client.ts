import { getBrowserSupabaseClient, isSupabaseConfigured as platformSupabaseConfigured } from '@prisma-glow/platform/supabase/client'

export const supabase = getBrowserSupabaseClient()
export const isSupabaseConfigured = platformSupabaseConfigured

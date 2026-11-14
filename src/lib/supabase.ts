import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True when Supabase keys are missing: the site shows placeholder data and admin is disabled. */
export const isDemoMode = !url || !anonKey || url.includes('YOUR-PROJECT-REF');

export const supabase: SupabaseClient | null = isDemoMode
  ? null
  : createClient(url!, anonKey!, { auth: { persistSession: true, autoRefreshToken: true } });

export const IMAGE_BUCKET = 'product-images';

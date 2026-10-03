import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Fail loudly at startup rather than producing a broken shell at runtime.
  throw new Error(
    'Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY ' +
    'in your .env.local (local) or in the host build environment (production).'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

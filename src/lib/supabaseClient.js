import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://xkzgeyhjtwnacxcuwwca.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhremdleWhqdHduYWN4Y3V3d2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NDQzMjAsImV4cCI6MjA5NzAyMDMyMH0.PxgtoVBkbHgLYzzWcxVe4hr-PAczdvqi2Qag3s5h-bk';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);


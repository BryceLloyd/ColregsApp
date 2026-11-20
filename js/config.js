// Public app configuration. The Supabase anon key is safe to ship to browsers:
// access is controlled by Row Level Security (see supabase/schema.sql).
// Leave both blank to keep the leaderboard on each device only.
window.APP_CONFIG={
  supabaseUrl:'',      // e.g. 'https://abcd1234.supabase.co'
  supabaseAnonKey:''   // Project Settings → API → anon public key
};

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey ||
    supabaseUrl === 'https://your-project.supabase.co' ||
    supabaseKey === 'your-service-role-key-here') {
  console.warn('⚠️ WARNING: Supabase credentials not configured. Auth features will fallback to local DB.');
  module.exports = null;
} else {
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
  console.log('✅ Supabase connected:', supabaseUrl);
  module.exports = supabase;
}


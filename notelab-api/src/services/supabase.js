const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey ||
    supabaseUrl === 'https://your-project.supabase.co' ||
    supabaseKey === 'your-service-role-key-here') {
  console.warn('WARNING: Supabase credentials not configured. Auth features will be unavailable.');
  module.exports = null;
} else {
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
  console.log('Supabase connected:', supabaseUrl);
  module.exports = supabase;
}

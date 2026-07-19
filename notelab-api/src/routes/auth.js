const express = require('express');
const router = express.Router();
const crypto = require('crypto');

function getSupabase() {
  const supabase = require('../services/supabase');
  if (!supabase) {
    return null;
  }
  return supabase;
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const supabase = getSupabase();
  if (!supabase) {
    return res.status(503).json({ error: 'Supabase sozlanmagan. .env faylini tekshiring.' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email va parol talab qilinadi.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Parol kamida 6 ta belgi bo\'lishi kerak.' });
    }

    // Email mavjudligini tekshirish
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'Bu email allaqachon ro\'yxatdan o\'tgan.' });
    }

    const password_hash = hashPassword(password);

    const { data, error } = await supabase
      .from('users')
      .insert([{ email: email.toLowerCase(), password_hash }])
      .select('id, email, created_at')
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, user: data });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const supabase = getSupabase();
  if (!supabase) {
    return res.status(503).json({ error: 'Supabase sozlanmagan. .env faylini tekshiring.' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email va parol talab qilinadi.' });
    }

    const password_hash = hashPassword(password);

    const { data, error } = await supabase
      .from('users')
      .select('id, email, created_at')
      .eq('email', email.toLowerCase())
      .eq('password_hash', password_hash)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(401).json({ error: 'Email yoki parol noto\'g\'ri.' });
    }

    res.json({ success: true, user: data });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/status
router.get('/status', (req, res) => {
  const supabase = getSupabase();
  res.json({
    supabase_connected: !!supabase,
    message: supabase ? 'Supabase ulangan' : 'Supabase sozlanmagan'
  });
});

module.exports = router;

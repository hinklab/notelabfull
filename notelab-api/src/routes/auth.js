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

const { readDB, writeDB } = require('../services/database');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, first_name, last_name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email va parol talab qilinadi.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Parol kamida 6 ta belgi bo\'lishi kerak.' });
  }

  const emailLower = email.toLowerCase().trim();
  const password_hash = hashPassword(password);
  const firstNameVal = first_name ? String(first_name).trim() : null;
  const lastNameVal = last_name ? String(last_name).trim() : null;

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data: existing, error: existingErr } = await supabase
        .from('users')
        .select('id')
        .eq('email', emailLower)
        .maybeSingle();

      if (!existingErr && existing) {
        return res.status(409).json({ error: 'Bu email allaqachon ro\'yxatdan o\'tgan.' });
      }

      const { data, error } = await supabase
        .from('users')
        .insert([{ email: emailLower, password_hash, first_name: firstNameVal, last_name: lastNameVal }])
        .select('id, email, first_name, last_name, created_at')
        .single();

      if (!error && data) {
        return res.status(201).json({ success: true, user: data });
      }
      console.warn('Supabase insert failed, falling back to local DB:', error ? error.message : 'No data');
    } catch (err) {
      console.warn('Supabase register error, falling back to local DB:', err.message);
    }
  }

  // Local JSON DB fallback for registration
  const db = readDB();
  if (!db.users) db.users = [];

  const existingUser = db.users.find(u => u.email.toLowerCase() === emailLower);
  if (existingUser) {
    return res.status(409).json({ error: 'Bu email allaqachon ro\'yxatdan o\'tgan.' });
  }

  const newUser = {
    id: crypto.randomUUID(),
    email: emailLower,
    password_hash,
    first_name: firstNameVal,
    last_name: lastNameVal,
    created_at: new Date().toISOString()
  };

  db.users.push(newUser);
  writeDB(db);

  res.status(201).json({
    success: true,
    user: {
      id: newUser.id,
      email: newUser.email,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      created_at: newUser.created_at
    }
  });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email va parol talab qilinadi.' });
  }

  const emailLower = email.toLowerCase().trim();
  const password_hash = hashPassword(password);

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, created_at')
        .eq('email', emailLower)
        .eq('password_hash', password_hash)
        .maybeSingle();

      if (!error && data) {
        return res.json({ success: true, user: data });
      }
    } catch (err) {
      console.warn('Supabase login error, falling back to local DB:', err.message);
    }
  }

  // Local JSON DB fallback for login
  const db = readDB();
  const user = (db.users || []).find(u => u.email.toLowerCase() === emailLower && u.password_hash === password_hash);

  if (!user) {
    return res.status(401).json({ error: 'Email yoki parol noto\'g\'ri.' });
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      first_name: user.first_name || null,
      last_name: user.last_name || null,
      created_at: user.created_at
    }
  });
});

// PATCH /api/auth/profile
router.patch('/profile', async (req, res) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Foydalanuvchi aniqlanmadi.' });
  }

  const { first_name, last_name } = req.body;
  const firstNameVal = first_name !== undefined ? String(first_name).trim() : null;
  const lastNameVal = last_name !== undefined ? String(last_name).trim() : null;

  const supabase = getSupabase();
  let updatedUser = null;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          first_name: firstNameVal,
          last_name: lastNameVal
        })
        .eq('id', userId)
        .select('id, email, first_name, last_name, created_at')
        .single();

      if (!error && data) {
        updatedUser = data;
      }
    } catch (err) {
      console.warn('Supabase profile update failed, falling back:', err.message);
    }
  }

  // Sync / Fallback in Local JSON DB
  const db = readDB();
  if (!db.users) db.users = [];
  const user = db.users.find(u => u.id === userId);

  if (user) {
    user.first_name = firstNameVal;
    user.last_name = lastNameVal;
    writeDB(db);
    if (!updatedUser) {
      updatedUser = {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        created_at: user.created_at
      };
    }
  } else if (!updatedUser) {
    return res.status(404).json({ error: 'Foydalanuvchi topilmadi.' });
  }

  res.json({ success: true, user: updatedUser });
});

// POST /api/auth/reset-password-email
router.post('/reset-password-email', async (req, res) => {
  const { email } = req.body;
  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Email manzilini kiriting.' });
  }

  const emailLower = email.toLowerCase().trim();
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailLower);
      if (!error) {
        return res.json({ success: true, message: 'Parolni tiklash havolasi elektron pochtangizga yuborildi.' });
      }
      console.warn('Supabase resetPasswordForEmail error:', error.message);
    } catch (err) {
      console.warn('Supabase reset password exception:', err.message);
    }
  }

  res.json({
    success: true,
    message: 'Agar ushbu email bazada mavjud bo\'lsa, parolni tiklash yo\'riqnomasi yuborildi.'
  });
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

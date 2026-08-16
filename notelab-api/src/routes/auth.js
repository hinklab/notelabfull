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
      // 1. Check if user already exists in public.users table
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', emailLower)
        .maybeSingle();

      if (existing) {
        return res.status(409).json({ error: 'Bu email allaqachon ro\'yxatdan o\'tgan.' });
      }

      // 2. Try registering user in Supabase Auth (auth.users) so they show in Supabase Auth Dashboard
      let authUserId = null;
      if (supabase.auth?.admin?.createUser) {
        try {
          const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
            email: emailLower,
            password: password,
            email_confirm: true,
            user_metadata: { first_name: firstNameVal, last_name: lastNameVal }
          });
          if (authErr) {
            if (authErr.message && authErr.message.includes('already registered')) {
              return res.status(409).json({ error: 'Bu email allaqachon ro\'yxatdan o\'tgan.' });
            }
            console.warn('Supabase auth.admin.createUser warning:', authErr.message);
          } else if (authData?.user) {
            authUserId = authData.user.id;
          }
        } catch (adminErr) {
          console.warn('Supabase auth admin exception:', adminErr.message);
        }
      }

      if (!authUserId && supabase.auth?.signUp) {
        try {
          const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
            email: emailLower,
            password: password,
            options: { data: { first_name: firstNameVal, last_name: lastNameVal } }
          });
          if (signUpErr && signUpErr.message && signUpErr.message.includes('already registered')) {
            return res.status(409).json({ error: 'Bu email allaqachon ro\'yxatdan o\'tgan.' });
          }
          if (signUpData?.user) {
            authUserId = signUpData.user.id;
          }
        } catch (signUpEx) {
          console.warn('Supabase signUp exception:', signUpEx.message);
        }
      }

      const newUserId = authUserId || crypto.randomUUID();

      // 3. Insert into public.users table
      let savedUser = null;

      // Try inserting with first_name and last_name
      const { data: insertedData, error: insertErr } = await supabase
        .from('users')
        .insert([{
          id: newUserId,
          email: emailLower,
          password_hash,
          first_name: firstNameVal,
          last_name: lastNameVal
        }])
        .select('id, email, first_name, last_name, created_at')
        .single();

      if (!insertErr && insertedData) {
        savedUser = insertedData;
      } else {
        console.warn('Supabase public.users insert with names failed (retrying without name columns):', insertErr?.message);
        // Fallback insert without first_name/last_name if table column doesn't exist
        const { data: insertedData2, error: insertErr2 } = await supabase
          .from('users')
          .insert([{
            id: newUserId,
            email: emailLower,
            password_hash
          }])
          .select('id, email, created_at')
          .single();

        if (!insertErr2 && insertedData2) {
          savedUser = { ...insertedData2, first_name: firstNameVal, last_name: lastNameVal };
        } else {
          console.error('Supabase public.users fallback insert error:', insertErr2?.message);
        }
      }

      if (savedUser) {
        return res.status(201).json({ success: true, user: savedUser });
      }

      // If user was created in Supabase Auth but public.users table insert had issue
      if (authUserId) {
        return res.status(201).json({
          success: true,
          user: {
            id: authUserId,
            email: emailLower,
            first_name: firstNameVal,
            last_name: lastNameVal,
            created_at: new Date().toISOString()
          }
        });
      }
    } catch (err) {
      console.warn('Supabase register main exception, falling back to local DB:', err.message);
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
  let supabaseUser = null;

  if (supabase) {
    try {
      // 1. Check public.users table
      const { data, error } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, created_at, password_hash')
        .eq('email', emailLower)
        .maybeSingle();

      if (!error && data) {
        supabaseUser = data;
        // If password_hash matches valid SHA256 hash
        if (data.password_hash && data.password_hash !== 'synced_session' && data.password_hash === password_hash) {
          const { password_hash: _, ...userWithoutPass } = data;
          return res.json({ success: true, user: userWithoutPass });
        }
      }

      // 2. Try Supabase Auth signInWithPassword if hash match didn't succeed directly
      if (supabase.auth?.signInWithPassword) {
        const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
          email: emailLower,
          password: password
        });

        if (!authErr && authData?.user) {
          const authenticatedUser = {
            id: authData.user.id,
            email: authData.user.email,
            first_name: authData.user.user_metadata?.first_name || supabaseUser?.first_name || null,
            last_name: authData.user.user_metadata?.last_name || supabaseUser?.last_name || null,
            created_at: authData.user.created_at
          };

          // Auto-repair password_hash in public.users
          await supabase.from('users').upsert([{
            id: authenticatedUser.id,
            email: emailLower,
            password_hash,
            first_name: authenticatedUser.first_name,
            last_name: authenticatedUser.last_name
          }]).catch(() => {});

          return res.json({ success: true, user: authenticatedUser });
        }
      }
    } catch (err) {
      console.warn('Supabase login error, falling back to local DB:', err.message);
    }
  }

  // 3. Local JSON DB fallback for login
  const db = readDB();
  const user = (db.users || []).find(u => u.email.toLowerCase() === emailLower && u.password_hash === password_hash);

  if (!user) {
    return res.status(401).json({ error: 'Email yoki parol noto\'g\'ri.' });
  }

  // Auto-repair & sync user to Supabase if Supabase is connected
  if (supabase) {
    try {
      if (supabase.auth?.admin?.createUser) {
        await supabase.auth.admin.createUser({
          id: user.id,
          email: user.email,
          email_confirm: true,
          user_metadata: { first_name: user.first_name || null, last_name: user.last_name || null }
        }).catch(() => {});
      }
      await supabase.from('users').upsert([{
        id: user.id,
        email: user.email.toLowerCase(),
        password_hash: user.password_hash,
        first_name: user.first_name || null,
        last_name: user.last_name || null
      }]).catch(() => {});
    } catch (syncEx) {
      console.warn('Auto-sync on login exception:', syncEx.message);
    }
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
  const { email, redirectTo } = req.body;
  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Email manzilini kiriting.' });
  }

  const emailLower = email.toLowerCase().trim();
  const supabase = getSupabase();

  if (supabase) {
    try {
      const redirectUrl = redirectTo || 'http://localhost:5173';
      const { error } = await supabase.auth.resetPasswordForEmail(emailLower, {
        redirectTo: redirectUrl,
      });
      if (!error) {
        return res.json({ success: true, message: 'Parolni tiklash havolasi elektron pochtangizga yuborildi.' });
      }
      console.warn('Supabase resetPasswordForEmail error:', error.message);
      return res.status(400).json({ error: error.message || 'Pochtaga xabar yuborishda xatolik yuz berdi.' });
    } catch (err) {
      console.warn('Supabase reset password exception:', err.message);
      return res.status(500).json({ error: err.message || 'Serverda xatolik yuz berdi.' });
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

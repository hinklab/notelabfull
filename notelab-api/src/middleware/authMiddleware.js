const DEFAULT_USER_ID = '0d3da195-1d0e-458b-9f88-2879561e0da6';
const getSupabase = () => require('../services/supabase');
const syncedUsersCache = new Set();

module.exports = function authMiddleware(req, res, next) {
  const headerUserId = req.headers['x-user-id'];
  const queryUserId = req.query?.user_id;
  const bodyUserId = req.body?.user_id;

  const userId = headerUserId || queryUserId || bodyUserId || DEFAULT_USER_ID;
  req.userId = String(userId);

  const email = req.headers['x-user-email'];
  const firstName = req.headers['x-user-first-name'];
  const lastName = req.headers['x-user-last-name'];

  if (email && !syncedUsersCache.has(req.userId)) {
    const supabase = getSupabase();
    if (supabase) {
      syncedUsersCache.add(req.userId);
      (async () => {
        try {
          const emailClean = String(email).toLowerCase().trim();
          
          // 1. Check if user row already exists in public.users
          const { data: existingUser } = await supabase
            .from('users')
            .select('id, password_hash')
            .eq('id', req.userId)
            .maybeSingle();

          if (existingUser) {
            // Update metadata ONLY; never overwrite existing valid password_hash
            const updatePayload = {
              email: emailClean,
              first_name: firstName || null,
              last_name: lastName || null
            };
            if (!existingUser.password_hash) {
              updatePayload.password_hash = 'synced_session';
            }
            await supabase.from('users').update(updatePayload).eq('id', req.userId).catch(() => {});
          } else {
            // Create user in Auth admin if not exists
            if (supabase.auth?.admin?.createUser) {
              await supabase.auth.admin.createUser({
                id: req.userId,
                email: emailClean,
                email_confirm: true,
                user_metadata: { first_name: firstName || null, last_name: lastName || null }
              }).catch(() => {});
            }
            // Insert into public.users
            await supabase.from('users').insert([{
              id: req.userId,
              email: emailClean,
              password_hash: 'synced_session',
              first_name: firstName || null,
              last_name: lastName || null
            }]).catch(() => {});
          }
        } catch (err) {
          console.warn('Middleware auto-sync user warning:', err.message);
        }
      })();
    }
  }

  next();
};

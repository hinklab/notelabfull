const DEFAULT_USER_ID = '0d3da195-1d0e-458b-9f88-2879561e0da6';

module.exports = function authMiddleware(req, res, next) {
  const headerUserId = req.headers['x-user-id'];
  const queryUserId = req.query?.user_id;
  const bodyUserId = req.body?.user_id;

  const userId = headerUserId || queryUserId || bodyUserId || DEFAULT_USER_ID;
  req.userId = String(userId);
  next();
};

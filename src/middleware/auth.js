function adminAuth(req, res, next) {
  const adminPassword = process.env.ADMIN_PASSWORD || 'wapibot2024';
  const auth = req.headers['authorization'];

  if (!auth || auth !== `Bearer ${adminPassword}`) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  next();
}

module.exports = adminAuth;
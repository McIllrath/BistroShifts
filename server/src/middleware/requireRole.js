function requireRole(requiredRole) {
  return function (req, res, next) {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'unauthorized' });
    const role = user.role || 'user';
    if (role !== requiredRole && role !== 'admin') {
      return res.status(403).json({ error: 'forbidden' });
    }
    next();
  };
}

module.exports = requireRole;

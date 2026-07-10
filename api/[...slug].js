const app = require('./index.js');

module.exports = async (req, res) => {
  // Vercel strips /api from the path for functions in the /api directory
  // We need to restore it so Express routing works correctly
  // e.g. /api/auth/login -> req.url = /auth/login, we need to restore to /api/auth/login
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + req.url;
  }
  return app(req, res);
};

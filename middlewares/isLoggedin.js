export const isLoggedIn = (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.redirect('/home');
  }

  if (req.session && req.session.user) {
    return res.redirect('/home');
  }

  next();
};


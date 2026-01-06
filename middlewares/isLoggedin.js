const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.redirect('/home');
  }

  if (req.session && req.session.user) {
    return res.redirect('/home');
  }

  next();
};

module.exports = isLoggedIn
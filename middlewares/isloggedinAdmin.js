const isLoggedIn = (req, res, next) => {
  if (req.session.admin) {
    return res.redirect('/admin/dashboard');
  }
  next();  
};


module.exports=isLoggedIn
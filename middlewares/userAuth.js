// const userAuth = (req, res, next) => {
//   if (!req.session.user) {
//     return res.redirect('/login');
//   }
//   next();
// };

// module.exports = userAuth;

const userAuth = (req, res, next) => {
    console.log('isAuthenticated:', req.isAuthenticated());
 console.log('user:', req.user);
 console.log('req.user:', req.user);
console.log('req.session.user:', req.session.user);

  if (req.isAuthenticated?.() || req.session.user ) {
      return next();
    // user logged in (Google or normal)
}
else{

    res.redirect('/login');
      console.log("hello")
}
};






module.exports = userAuth


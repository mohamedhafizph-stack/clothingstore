import express from 'express'
const router = express.Router();
import passport from 'passport'


router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);  


router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {

    req.session.user = {
      id: req.user._id
    };

    res.redirect('/home');  
  } 
);



router.get('/logout', (req, res) => {
  req.logout(err => {
    if(err) console.log(err);
    res.redirect('/login');
  });
});

export default router
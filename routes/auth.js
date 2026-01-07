const express = require('express');
const router = express.Router();
const passport = require('passport');


router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);  


router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    
    res.redirect('/home');  
  } 
); 


router.get('/logout', (req, res) => {
  req.logout(err => {
    if(err) console.log(err);
    res.redirect('/login');
  });
});

module.exports = router;

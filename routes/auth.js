const express = require('express');
const router = express.Router();
const passport = require('passport');

// Start Google login
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);  

// Google OAuth callback
router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful login
    res.redirect('/home');   // Or your logged-in homepage
  } 
); 

// Logout
router.get('/logout', (req, res) => {
  req.logout(err => {
    if(err) console.log(err);
    res.redirect('/login');
  });
});

module.exports = router;

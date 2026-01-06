const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../model/User');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,           // From Google Cloud Console
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,   // From Google Cloud Console
    callbackURL: "/auth/google/callback"             // Route Google will redirect to
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;

      let user = await User.findOne({ email });

      if (!user) {
        // If user doesn't exist, create a new user
        user = new User({
          name: profile.displayName,
          email,
          password: '', 
          authProvider:"google" ,      // no password needed for Google login
          isVerified: true
        });
        await user.save();
      }
      
      return done(null, user);
     

    } catch (err) {
      return done(err, null);
      
    }
  }
));

// Serialize user into session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user); 
});

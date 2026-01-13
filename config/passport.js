

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../model/User.js";


passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,           
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,   
    callbackURL: "/auth/google/callback"            
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;

      let user = await User.findOne({ email });

       if (user && user.status === 'blocked') {
        return done(null, false, {
          message: 'Your account is blocked'
        });
      }

      if (!user) {  
     
        user = new User({
          name: profile.displayName,
          email,
          password: '', 
          authProvider:"google" ,      
          status:"active" , 
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


passport.serializeUser((user, done) => {
  done(null, user.id);
});


passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user); 
});

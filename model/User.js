const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },

  email: { 
    type: String, 
    required: true, 
    unique: true 
  }, 

  // ❗ password NOT required (for Google users)
  password: { 
    type: String, 
    required: false 
  },

  // ✅ Google login support
  googleId: {
    type: String,
    default: null
  },

  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },

  status: { 
    type: String, 
    enum: ['active', 'blocked'], 
    default: 'active' 
  },

  // OTP (can keep for now)
  otp: String,
  otpExpires: Date,

  isVerified: {
    type: Boolean,
    default: false
  },

  profilePic: {
  type: String,
  default: null
}

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);

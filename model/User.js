import mongoose from 'mongoose'
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

  password: { 
    type: String, 
    required: false 
  },

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

  otp: String,
  otpExpires: Date,

  isVerified: {
    type: Boolean,
    default: false
  },

  profilePic: {
  type: String,
  default: null
},

}, { timestamps: true });

const User = mongoose.model('User',userSchema)
export default User
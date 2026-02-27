import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false },
  googleId: { type: String, default: null },
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  status: { type: String, enum: ['active', 'blocked'], default: 'active' },
  otp: String,
  otpExpires: Date,
  isVerified: { type: Boolean, default: false },
  profilePic: { type: String, default: null },

  wallet: { type: Number, default: 0 },
  walletHistory: [{
    amount: { type: Number, required: true },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    reason: { type: String, required: true },
    date: { type: Date, default: Date.now }
}],
  referralCode: { type: String, unique: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }

}, { timestamps: true });

userSchema.pre('save', function(next) {
  if (!this.referralCode) {
    this.referralCode = 'WEAR-' + Math.random().toString(36).substring(2, 7).toUpperCase();
  }
  
});

const User = mongoose.model('User', userSchema);
export default User;
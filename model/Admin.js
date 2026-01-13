import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  }
}, { timestamps: true });

adminSchema.pre('save', async function () {
  if (!this.isModified('password')) return ;
  this.password = await bcrypt.hash(this.password, 10);
});

const Admin = mongoose.model('Admin',adminSchema)
export default Admin
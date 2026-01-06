const mongoose = require('mongoose');
require('dotenv').config();
const Admin = require('./model/Admin');

mongoose.connect(process.env.MONGO_URI);

const createAdmin = async () => {
  await Admin.create({
    email: 'admin@wearify.com',
    password: 'admin123'
  });
  console.log('Admin created');
  process.exit();
};

createAdmin();

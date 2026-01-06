require('dotenv').config()
const express = require('express')
const nodemon = require('nodemon')

const path = require('path')
const session = require('express-session');
const connectDB = require('./db/connectDB');
const passport = require('passport');
require('./config/passport');  // load Google strategy

const app = express()
connectDB();



app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
// EJS setup
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});



const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user/user')
const authRoutes = require('./routes/auth');
app.use('/admin', adminRoutes);
app.use('/', userRoutes);
app.use('/auth', authRoutes);

// Home route
app.get('/', (req, res) => {
  res.send('Wearify server is running 🚀')
})

// Start server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})


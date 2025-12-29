require('dotenv').config()
const express = require('express')
const app = express()
const path = require('path')

// EJS setup
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))

// Home route
app.get('/', (req, res) => {
  res.send('Wearify server is running 🚀')
})

// Start server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

import "./config/env.js";

import express from "express";
import methodOverride from "method-override";
import path from "path";
import session from "express-session";
import passport from "passport";
import { fileURLToPath } from "url";
import { dirname } from "path";

import connectDB from "./db/connectDB.js";
import "./config/passport.js"; 

import adminRoutes from "./routes/admin.js";
import userRoutes from "./routes/user/user.js";
import authRoutes from "./routes/auth.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
connectDB();

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());



app.set('view engine', 'ejs'); 


app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  next();
});


app.use("/admin", adminRoutes);
app.use("/auth", authRoutes);
app.use("/", userRoutes);

app.get("/", (req, res) => {
  res.send("Wearify server is running 🚀");
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

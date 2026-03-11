import rateLimit from 'express-rate-limit';

// Global limiter: applied to all routes to prevent general abuse
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: "Too many requests from this IP, please try again after 15 minutes",
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, 
});

// Strict limiter: specifically for Auth (Login/Signup/OTP)
export const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Only 5 attempts allowed per hour
    message: "Too many login attempts. Please try again in an hour.",
    handler: (req, res, next, options) => {
        // You can render your custom error page here!
        res.status(429).render('user/product-unavailable', { 
        message: options.message 
       });
    }
});
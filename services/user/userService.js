import User from '../../model/User.js';
import Address from '../../model/address.js';
import Category from '../../model/category.js';
import Product from '../../model/Product.js';
import bcrypt from 'bcryptjs';
import { sendOtp } from '../../utils/sendOtp.js';

/**
 * HOME & PRODUCT LOGIC
 */
export const getHomeData = async (isAuthenticated = false, userId = null) => {
    const categories = await Category.find({ status: "active" });
    const activeCategoryNames = categories.map(cat => cat.name);

    // Filter products: Must be Active, in an active category, and in stock
    const productQuery = { 
        status: "Active", 
        category: { $in: activeCategoryNames },
        totalStock: { $gt: 0 } 
    };

    const [newArrivals, bestSellers] = await Promise.all([
        Product.find(productQuery).sort({ createdAt: -1 }).limit(4),
        Product.find(productQuery).limit(4)
    ]);

    let userData = null;
    if (isAuthenticated && userId) {
        userData = await User.findById(userId);
    }

    return { categories, newArrivals, bestSellers, user: userData };
};

/**
 * AUTHENTICATION LOGIC
 */
export const processRegistration = async (userData) => {
    const { email } = userData;
    const existingUser = await User.findOne({ email });
    if (existingUser) throw new Error('Email already registered');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await sendOtp(email, otp);
    return otp;
};

export const finalizeUser = async (tempUser) => {
    const hashedPassword = await bcrypt.hash(tempUser.password, 10);
    const user = new User({
        name: tempUser.name,
        email: tempUser.email,
        password: hashedPassword,
        isVerified: true,
    });
    return await user.save();
};

export const verifyUserCredentials = async (email, password) => {
    const user = await User.findOne({ email });
    if (!user) throw new Error("Invalid Email ID");
    if (user.status === 'blocked') throw new Error("Account blocked by admin");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Incorrect Password");

    return user;
};

/**
 * PROFILE & PASSWORD LOGIC
 */
export const updateProfile = async (userId, { name, currentpassword, password }) => {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    if (name) user.name = name;

    if (password && user.authProvider === 'local') {
        const isMatch = await bcrypt.compare(currentpassword, user.password);
        if (!isMatch) throw new Error("Current password incorrect");
        user.password = await bcrypt.hash(password, 10);
    }

    return await user.save();
};

/**
 * ADDRESS LOGIC
 */
export const addressService = {
    getAll: (userId) => Address.find({ userId }),
    getById: (id) => Address.findById(id),
    add: (userId, data) => new Address({ ...data, userId }).save(),
    update: (id, data) => Address.findByIdAndUpdate(id, data),
    delete: (id) => Address.findByIdAndDelete(id),
    setDefault: async (userId, addressId) => {
        await Address.updateMany({ userId }, { isDefault: false });
        return Address.findByIdAndUpdate(addressId, { isDefault: true });
    }
};
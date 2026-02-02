import Admin from '../../model/Admin.js';
import User from '../../model/User.js';
import Orders from '../../model/Orders.js';
import bcrypt from "bcryptjs";

export const authenticateAdmin = async (email, password) => {
    const admin = await Admin.findOne({ email });
    if (!admin) return null;

    const isMatch = await bcrypt.compare(password, admin.password);
    return isMatch ? admin : null;
};

export const fetchUserListData = async (search, page, limit) => {
    const skip = (page - 1) * limit;
    let query = {};

    if (search) {
        query = {
            $or: [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ]
        };
    }

   
    const [totalUsers, users] = await Promise.all([
        User.countDocuments(query),
        User.find(query).skip(skip).limit(limit).lean()
    ]);

    return {
        users,
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers
    };
};

export const toggleBlockStatus = async (userId) => {
    const user = await User.findById(userId);
    if (!user) return null;

    user.status = user.status === 'active' ? 'blocked' : 'active';
    await user.save();
    return user;
};
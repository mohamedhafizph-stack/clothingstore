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
        User.find(query).skip(skip).limit(limit).lean(),
    ]);
    
    const usersWithCounts = await Promise.all(users.map(async (user) => {
        const orderCount = await Orders.countDocuments({ user: user._id });
        return { 
            ...user,
            orderCount
        };
    }));
console.log(usersWithCounts)
    return {
        users: usersWithCounts,
        totalUsers,
        totalPages: Math.ceil(totalUsers / limit)
    };
};

export const toggleBlockStatus = async (userId) => {
    const user = await User.findById(userId);
    if (!user) return null;

    user.status = user.status === 'active' ? 'blocked' : 'active';
    await user.save();
    return user;
};

export const getDashboardData = async () => {
    const [salesStats, orderCount, recentOrders, weeklySales] = await Promise.all([
        Orders.aggregate([
            { $match: { status: "Delivered" } },
            { $group: { _id: null, total: { $sum: "$totalPrice" } } }
        ]),
        Orders.countDocuments(),
        Orders.find().sort({ createdAt: -1 }).limit(5).populate('user', 'name'),
        Orders.aggregate([
            { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
            { $group: { 
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, 
                dailySales: { $sum: "$totalPrice" },
                dailyOrders: { $sum: 1 }
            }},
            { $sort: { "_id": 1 } }
        ])
    ]);

    const totalRevenue = salesStats.length > 0 ? salesStats[0].total : 0;

    return {
        stats: {
            sales: totalRevenue,
            orders: orderCount,
            revenue: totalRevenue,
            avgValue: orderCount > 0 ? (totalRevenue / orderCount).toFixed(2) : 0
        },
        recentActivity: recentOrders.map(order => ({
            id: order._id.toString().slice(-6).toUpperCase(),
            customer: order.user?.name || 'Guest',
            amount: order.totalPrice,
            status: order.status
        })),
        chartData: {
            labels: weeklySales.map(d => d._id),
            sales: weeklySales.map(d => d.dailySales),
            orders: weeklySales.map(d => d.dailyOrders)
        }
    };
};
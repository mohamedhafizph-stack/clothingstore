import * as adminService from '../../services/admin/adminService.js';
import User from '../../model/User.js';
import Orders from '../../model/Orders.js';
import logger from '../../utils/logger.js';
export const loadLoginPage = (req, res) => {
    res.render('admin/login', { error: null });
};


export const loadDashboard = async (req, res) => {
    try {
        // Pass req.query to the service to apply the date filters
        const data = await adminService.getDashboardData(req.query);

        res.render('admin/dashboard', {
            stats: data.stats,
            activity: data.recentActivity,
            chartData: data.chartData
        });
    } catch (error) {
       logger.error("Dashboard Error", { 
    message: error.message, 
    stack: error.stack,
    context: "Admin Dashboard" 
});
        // Better UX: render the page with empty data instead of a raw 500 error
        res.status(500).render('admin/dashboard', {
            stats: { revenue: 0, orders: 0, avgValue: 0 },
            activity: [],
            chartData: { labels: [], sales: [], orders: [] },
            error: "Failed to load dashboard data"
        });
    }
};
export const logingIn = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await adminService.authenticateAdmin(email, password);

        if (!admin) {
            return res.render('admin/login', { error: 'Invalid email or password' });
        }

        req.session.admin = admin._id;
        res.redirect('/admin/dashboard');
    } catch (error) {
       logger.error("Login Error", { 
    message: error.message, 
    stack: error.stack,
    ip: req.ip, 
    email: req.body.email 
});
        res.render('admin/login', { error: 'An internal server error occurred.' });
    }
};

export const loadUserList = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const search = req.query.search || '';
        const { users, totalPages,count } = await adminService.fetchUserListData(search, page, limit);
        res.render('admin/usermanagment', {
            users,
            currentPage: page,
            totalPages,
            search,count:null
        });
    } catch (error) {
        logger.error("User List Error", { 
    message: error.message, 
    stack: error.stack,
    adminId: req.user?._id, // Tracks which admin tried to view the list
    query: req.query       // Tracks if specific filters or pagination caused the crash
});
        res.status(500).send('Error loading users');
    }
};

export const toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedUser = await adminService.toggleBlockStatus(id);

        if (!updatedUser) {
            return res.status(404).send('User not found');
        }

        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({ success: true, status: updatedUser.status });
        }

        res.redirect('/admin/users');
    } catch (error) {
       logger.error("Toggle Status Error", { 
    message: error.message, 
    stack: error.stack,
    targetId: req.params.id, // The ID of the item being toggled
    adminId: req.user?._id,   // Who tried to change the status
    action: "Toggle Status"
});
        res.status(500).send('Error updating status');
    }
};
export const adminLogout = (req, res) => {
    delete req.session.admin; 

    req.session.save((err) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.redirect('/admin/login');
    });
};

const authController = { loadLoginPage, logingIn, loadUserList, toggleUserStatus,loadDashboard,adminLogout };
export default authController;
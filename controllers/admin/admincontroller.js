import * as adminService from '../../services/admin/adminService.js';

export const loadLoginPage = (req, res) => {
    res.render('admin/login', { error: null });
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
        console.error("Login Error:", error);
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
        console.error("User List Error:", error);
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
        console.error("Toggle Status Error:", error);
        res.status(500).send('Error updating status');
    }
};


const authController = { loadLoginPage, logingIn, loadUserList, toggleUserStatus };
export default authController;
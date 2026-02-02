import * as returnService from '../../services/admin/returnService.js';

export const getReturnRequests = async (req, res) => {
    try {
        const { search, status } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = 10;

        const results = await returnService.fetchReturnRequests(search, status);

        const totalItems = results.length;
        const totalPages = Math.ceil(totalItems / limit);
        const paginatedOrders = results.slice((page - 1) * limit, page * limit);

        res.render('admin/return', { 
            orders: paginatedOrders, 
            searchQuery: search || '',
            currentStatus: status || 'All',
            currentPage: page,
            totalPages
        });
    } catch (error) {
        res.status(500).send("Error fetching returns");
    }
};

export const handleReturnAction = async (req, res) => {
    try {
        const { orderId, itemId, action } = req.body;
        await returnService.processSingleReturn(orderId, itemId, action);
        res.json({ success: true, message: `Return ${action}ed successfully` });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const approveFullOrderReturn = async (req, res) => {
    try {
        await returnService.processFullOrderReturn(req.body.orderId);
        res.json({ success: true, message: "Full order return processed" });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const returnController = { getReturnRequests, handleReturnAction, approveFullOrderReturn };
export default returnController;
import * as orderService from '../../services/admin/orderService.js';

export const getAdminOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const { search, status } = req.query;

        const { orders, totalOrders } = await orderService.fetchAdminOrders(search, status, page, limit);

        res.render('admin/orders', {
            orders,
            currentPage: page,
            totalPages: Math.ceil(totalOrders / limit),
            currentStatus: status || 'All',
            searchTerm: search || '',
            activePage: 'orders',
            totalOrders
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error loading admin orders");
    }
};

export const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { newStatus } = req.body;
        await orderService.updateMainOrderStatus(orderId, newStatus);
        res.json({ success: true, message: "Status updated successfully" });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const updateItemStatus = async (req, res) => {
    try {
        const { orderId, itemId, status } = req.body;
        await orderService.updateSpecificItemStatus(orderId, itemId, status);
        res.json({ success: true, message: "Item and Order status updated" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const handleReturnStatus = async (req, res) => {
    try {
        const { orderId, itemId, action } = req.body; 
        await orderService.processReturnAction(orderId, itemId, action);
        res.json({ success: true, message: `Return ${action}ed successfully` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getorderDetails = async (req, res) => {
    try {
        const order = await orderService.fetchFullOrderDetails(req.params.id);
        if (!order) {
            return res.status(404).render('admin/error', { message: 'Order not found' });
        }
        res.render('admin/order-details', { order });
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
};

const orderController = { getAdminOrders, updateOrderStatus, updateItemStatus, handleReturnStatus, getorderDetails };
export default orderController;
import Order from '../../model/Orders.js';
import Product from '../../model/Product.js';
import { getOrderDetails } from '../user/order-controller.js';

export const getAdminOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        let query = {};
        if (req.query.search) {
            query.orderId = { $regex: req.query.search, $options: 'i' };
        }
        if (req.query.status && req.query.status !== 'All') {
            query.status = req.query.status;
        }

        const totalOrders = await Order.countDocuments(query);
        const orders = await Order.find(query)
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.render('admin/orders', {
            orders,
            currentPage: page,
            totalPages: Math.ceil(totalOrders / limit),
            currentStatus: req.query.status || 'All',
            searchTerm: req.query.search || '',
            activePage: 'orders'
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

        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ message: "Order not found" });

        const terminalStates = ['Cancelled', 'Returned', 'Delivered'];

        if (terminalStates.includes(order.status)) {
            return res.status(400).json({ 
                success: false, 
                message: `This order is already ${order.status} and cannot be changed.` 
            });
        }

        order.status = newStatus;
        await order.save();

        res.json({ success: true, message: "Status updated successfully" });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};
export const updateItemStatus = async (req, res) => {
    try {
        const { orderId, itemId, status } = req.body;
        const order = await Order.findById(orderId);
        
        const item = order.items.id(itemId);
        item.status = status;

        const statuses = order.items.map(i => i.status);

        if (statuses.every(s => s === 'Cancelled')) {
            order.status = 'Cancelled';
        } else if (statuses.every(s => s === 'Delivered' || s === 'Cancelled')) {
            order.status = 'Delivered';
        } else if (statuses.some(s => s === 'Shipped')) {
            order.status = 'Shipped';
        } else if (statuses.some(s => s === 'Return Requested')) {
            order.status = 'Return Requested';
        } else {
            order.status = 'Processing';
        }

        await order.save();
        res.json({ success: true, message: "Item and Order status updated" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
export const handleReturnStatus = async (req, res) => {
    try {
        const { orderId, itemId, action } = req.body; 
        const order = await Order.findById(orderId);
        const item = order.items.id(itemId);

        if (action === 'Approve') {
            item.status = 'Returned';

            const refundAmount = item.price * item.quantity;
            await User.findByIdAndUpdate(order.user, {
                $inc: { wallet: refundAmount },
                $push: { walletHistory: { 
                    amount: refundAmount, 
                    type: 'Credit', 
                    reason: `Return Approved: ${item.productName}` 
                }}
            });

            await Product.findByIdAndUpdate(item.product, {
                $inc: { quantity: item.quantity }
            });

            order.totalPrice -= refundAmount;

        } else {
           
            item.status = 'Delivered';
        }

        const statuses = order.items.map(i => i.status);
        if (statuses.every(s => s === 'Returned' || s === 'Cancelled')) {
            order.status = 'Returned';
        } else {
            order.status = 'Delivered';
        }

        await order.save();
        res.json({ success: true, message: `Return ${action}ed successfully` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
const getorderDetails = async (req, res) => {
    try {
        const orderId = req.params.id;

        const order = await Order.findById(orderId)
            .populate('user', 'name email') 
            .populate('items.product');

        if (!order) {
            return res.status(404).render('admin/error', { message: 'Order not found' });
        }

        res.render('admin/order-details', { 
            order,
          
        });

    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).send('Internal Server Error');
    }
};
const orderController = {getAdminOrders,updateOrderStatus,updateItemStatus,handleReturnStatus,getorderDetails}
export default orderController
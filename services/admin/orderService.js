import Order from '../../model/Orders.js';
import Product from '../../model/Product.js';
import User from '../../model/User.js';

export const fetchAdminOrders = async (search, status, page, limit) => {
    const skip = (page - 1) * limit;
    let query = {};

    if (search) {
        query.orderId = { $regex: search, $options: 'i' };
    }
    if (status && status !== 'All') {
        query.status = status;
    }

    const [orders, totalOrders] = await Promise.all([
        Order.find(query)
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Order.countDocuments(query)
    ]);

    return { orders, totalOrders };
};

export const updateMainOrderStatus = async (orderId, newStatus) => {
    const order = await Order.findById(orderId);
    if (!order) throw new Error("Order not found");

    const terminalStates = ['Cancelled', 'Returned', 'Delivered'];
    if (terminalStates.includes(order.status)) {
        throw new Error(`Order is already ${order.status} and cannot be changed.`);
    }

    order.status = newStatus;
    return await order.save();
};

export const updateSpecificItemStatus = async (orderId, itemId, newStatus) => {
    const order = await Order.findById(orderId);
    const item = order.items.id(itemId);
    if (!item) throw new Error("Item not found");

    item.status = newStatus;

    const statuses = order.items.map(i => i.status);
    if (statuses.every(s => s === 'Cancelled')) {
        order.status = 'Cancelled';
    } else if (statuses.every(s => s === 'Delivered' || s === 'Cancelled')) {
        order.status = 'Delivered';
    } else if (statuses.some(s => s === 'Shipped')) {
        order.status = 'Shipped';
    } else {
        order.status = 'Processing';
    }

    return await order.save();
};

export const processReturnAction = async (orderId, itemId, action) => {
    const order = await Order.findById(orderId);
    const item = order.items.id(itemId);
    if (!item) throw new Error("Item not found");

    if (action === 'Approve') {
        item.status = 'Returned';
        const refundAmount = item.price * item.quantity;

        await User.findByIdAndUpdate(order.user, {
            $inc: { wallet: refundAmount },
            $push: { walletHistory: { 
                amount: refundAmount, 
                type: 'Credit', 
                reason: `Return Approved: ${item.productName || 'Product'}`,
                date: new Date()
            }}
        });

        await Product.findOneAndUpdate(
            { _id: item.product, "variants.size": item.size },
            { $inc: { "variants.$.stock": item.quantity, totalStock: item.quantity } }
        );

        order.totalPrice -= refundAmount;
    } else {
        item.status = 'Delivered';
    }

    const statuses = order.items.map(i => i.status);
    order.status = statuses.every(s => s === 'Returned' || s === 'Cancelled') ? 'Returned' : 'Delivered';

    return await order.save();
};

export const fetchFullOrderDetails = async (orderId) => {
    return await Order.findById(orderId)
        .populate('user', 'name email')
        .populate('items.product');
};
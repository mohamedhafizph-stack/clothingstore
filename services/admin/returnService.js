import Order from '../../model/Orders.js';
import Product from '../../model/Product.js';
import User from '../../model/User.js';

export const fetchReturnRequests = async (search, status) => {
    let query = { "items.status": { $in: ["Return Requested", "Returned"] } };

    if (status && status !== 'All') {
        query["items.status"] = status;
    }

    if (search) {
        const matchingUsers = await User.find({ 
            name: { $regex: search, $options: 'i' } 
        }).select('_id');
        const userIds = matchingUsers.map(u => u._id);

        query.$or = [
            { orderId: { $regex: search, $options: 'i' } },
            { user: { $in: userIds } }
        ];
    }

    const orders = await Order.find(query)
        .populate('user', 'name email')
        .populate('items.product', 'name')
        .sort({ updatedAt: -1 });

    if (search && search.toUpperCase().startsWith('RTN')) {
        const shortId = search.toUpperCase().replace('RTN', '');
        return orders.filter(order => 
            order.items.some(item => 
                item._id.toString().slice(-5).toUpperCase().includes(shortId)
            )
        );
    }

    return orders;
};

export const processSingleReturn = async (orderId, itemId, action) => {
    const order = await Order.findById(orderId);
    if (!order) throw new Error("Order not found");

    const item = order.items.id(itemId);
    if (!item) throw new Error("Item not found");

    if (action === 'Approve') {
        item.status = 'Returned';
        const refundAmount = item.price * item.quantity;

        await Product.updateOne(
            { _id: item.product, "variants.size": item.size },
            { $inc: { "variants.$.stock": item.quantity, "totalStock": item.quantity } }
        );

        await User.findByIdAndUpdate(order.user, {
            $inc: { wallet: refundAmount },
            $push: { walletHistory: { 
                amount: refundAmount, type: 'Credit', 
                reason: `Refund for Return: ORD${order.orderId}`, date: new Date()
            }}
        });

        order.totalPrice -= refundAmount;
    } else {
        item.status = 'Delivered';
    }

    const activeItems = order.items.filter(i => i.status !== 'Returned' && i.status !== 'Cancelled');
    order.status = activeItems.length === 0 ? 'Returned' : 'Delivered';

    return await order.save();
};

export const processFullOrderReturn = async (orderId) => {
    const order = await Order.findById(orderId);
    if (!order) throw new Error("Order not found");

    let totalRefund = 0;

    for (let item of order.items) {
        if (['Return Requested', 'Delivered'].includes(item.status)) {
            item.status = 'Returned';
            const itemTotal = item.price * item.quantity;
            totalRefund += itemTotal;

            await Product.updateOne(
                { _id: item.product, "variants.size": item.size },
                { $inc: { "variants.$.stock": item.quantity, "totalStock": item.quantity } }
            );
        }
    }

    if (totalRefund > 0) {
        await User.findByIdAndUpdate(order.user, {
            $inc: { wallet: totalRefund },
            $push: { walletHistory: { 
                amount: totalRefund, type: 'Credit', 
                reason: `Full Return Approved: ORD${order.orderId}`, date: new Date()
            }}
        });
        order.totalPrice -= totalRefund;
    }

    order.status = 'Returned';
    return await order.save();
};
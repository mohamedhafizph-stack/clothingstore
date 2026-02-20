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
        const itemOriginalTotal = Number(item.price) * Number(item.quantity);

        let refundAmount = itemOriginalTotal;

        if (order.couponDiscount > 0 && order.subtotal > 0) {
            const discountRatio = order.couponDiscount / order.subtotal;
            const itemShareOfDiscount = itemOriginalTotal * discountRatio;
            
            refundAmount = itemOriginalTotal - itemShareOfDiscount;
        }

        refundAmount = Math.max(0, Number(refundAmount.toFixed(2)));

        item.status = 'Returned';

        await Product.updateOne(
            { _id: item.product, "variants.size": item.size },
            { 
                $inc: { 
                    "variants.$.stock": item.quantity, 
                    "totalStock": item.quantity 
                } 
            }
        );

        await User.findByIdAndUpdate(order.user, {
            $inc: { wallet: refundAmount },
            $push: { 
                walletHistory: { 
                    amount: refundAmount, 
                    type: 'Credit', 
                    reason: `Refund for Item Return: ${item.product.name} (ORD${order.orderId})`, 
                    date: new Date()
                }
            }
        });

        order.totalPrice = Math.max(0, order.totalPrice - refundAmount);

    } else if (action === 'Reject') {
        item.status = 'Delivered'; 
    }

    const activeItems = order.items.filter(i => 
        i.status !== 'Returned' && 
        i.status !== 'Cancelled'
    );
    
    order.status = activeItems.length === 0 ? 'Returned' : 'Delivered';

    return await order.save();
};

export const processFullOrderReturn = async (orderId) => {
    const order = await Order.findById(orderId);
    if (!order) throw new Error("Order not found");

    const totalRefund = order.totalPrice; 

    for (let item of order.items) {
        if (['Return Requested', 'Delivered', 'Shipped'].includes(item.status)) {
            item.status = 'Returned';

            await Product.updateOne(
                { _id: item.product, "variants.size": item.size },
                { $inc: { "variants.$.stock": item.quantity, "totalStock": item.quantity } }
            );
        }
    }

    if (totalRefund > 0) {
        await User.findByIdAndUpdate(order.user, {
            $inc: { wallet: Number(totalRefund.toFixed(2)) },
            $push: { walletHistory: { 
                amount: Number(totalRefund.toFixed(2)), 
                type: 'Credit', 
                reason: `Full Refund for Order: ORD${order.orderId}`, 
                date: new Date()
            }}
        });
        
        order.totalPrice = 0;
    }

    order.status = 'Returned';
    return await order.save();
};
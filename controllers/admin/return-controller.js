import Order from '../../model/Orders.js';
import Product from '../../model/Product.js';
import User from '../../model/User.js';

export const getReturnRequests = async (req, res) => {
    try {
        const { search, status } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = 10; 

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

        let finalResults = orders;
        if (search && search.toUpperCase().startsWith('RTN')) {
            const shortId = search.toUpperCase().replace('RTN', '');
            finalResults = orders.filter(order => 
                order.items.some(item => 
                    item._id.toString().slice(-5).toUpperCase().includes(shortId)
                )
            );
        }

        const totalItems = finalResults.length;
        const totalPages = Math.ceil(totalItems / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        
        const paginatedOrders = finalResults.slice(startIndex, endIndex);

        res.render('admin/return', { 
            orders: paginatedOrders, 
            searchQuery: search || '',
            currentStatus: status || 'All',
            currentPage: page,
            totalPages: totalPages
        });
    } catch (error) {
        console.error("Return Search Error:", error);
        res.status(500).send("Error fetching returns");
    }
};

export const handleReturnAction = async (req, res) => {
    try {
        const { orderId, itemId, action } = req.body; 
        const order = await Order.findById(orderId);
        
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        const item = order.items.id(itemId);
        if (!item) return res.status(404).json({ success: false, message: "Item not found" });

        if (action === 'Approve') {
       
            item.status = 'Returned';

          
            const refundAmount = item.price * item.quantity;
            await User.findByIdAndUpdate(order.user, {
                $inc: { wallet: refundAmount },
                $push: { 
                    walletHistory: { 
                        amount: refundAmount, 
                        type: 'Credit', 
                        reason: `Refund for Return: ORD${order.orderId}`,
                        date: new Date()
                    } 
                }
            });

            
            await Product.findByIdAndUpdate(item.product, {
                $inc: { quantity: item.quantity }
            });

           
            order.totalPrice -= refundAmount;

        } else if (action === 'Reject') {
           
            item.status = 'Delivered';
        }

        const remainingActiveItems = order.items.filter(i => 
            i.status !== 'Returned' && i.status !== 'Cancelled'
        );
        
        if (remainingActiveItems.length === 0) {
            order.status = 'Returned';
        } else {
            
            order.status = 'Delivered';
        }

        await order.save();
        res.json({ success: true, message: `Return ${action}ed successfully` });

    } catch (error) {
        console.error("Return Action Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
export const approveFullOrderReturn = async (req, res) => {
    try {
        const { orderId } = req.body;
        const order = await Order.findById(orderId);
        let totalRefund = 0;

        for (let item of order.items) {
            if (item.status === 'Return Requested') {
                item.status = 'Returned';
                
                const itemTotal = item.price * item.quantity;
                totalRefund += itemTotal;

                await Product.findByIdAndUpdate(item.product, {
                    $inc: { quantity: item.quantity }
                });
            }
        }

        if (totalRefund > 0) {
            await User.findByIdAndUpdate(order.user, {
                $inc: { wallet: totalRefund },
                $push: { walletHistory: { 
                    amount: totalRefund, 
                    type: 'Credit', 
                    reason: `Full Return Approved: ORD${order.orderId}` 
                }}
            });
            order.totalPrice -= totalRefund;
        }

        order.status = 'Returned';
        await order.save();

        res.json({ success: true, message: "Full order return processed and refunded" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const returnController = { getReturnRequests,handleReturnAction,approveFullOrderReturn}
export default returnController
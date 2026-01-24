import Order from '../../model/Orders.js';
import Cart from '../../model/cart.js';
import Address from '../../model/address.js';
import Product from '../../model/Product.js';
import PDFDocument from 'pdfkit';

export const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user?.id || req.user;
        const { addressId } = req.body;

        const [cart, selectedAddress] = await Promise.all([
            Cart.findOne({ user: userId }).populate('items.product'),
            Address.findById(addressId)
        ]);

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: "Cart is empty" });
        }

        const orderItems = cart.items.map(item => {
           
            const itemPrice = Number(item.price);
            
            return {
                product: item.product._id,
                quantity: item.quantity,
                price: itemPrice, 
                size: item.size    
            };
        });

        const totalAmount = orderItems.reduce((acc, item) => {
            return acc + (item.price * item.quantity);
        }, 0);

        if (isNaN(totalAmount)) {
            return res.status(400).json({ success: false, message: "Error calculating total price." });
        }

        const newOrder = new Order({
            user: userId,
            items: orderItems,
            shippingAddress: {
                fullName: selectedAddress.fullName,
                addressLine: selectedAddress.addressLine,
                city: selectedAddress.city,
                state: selectedAddress.state,
                pincode: selectedAddress.pincode,
                phone: selectedAddress.phone
            },
            totalPrice: totalAmount,
            paymentMethod: 'COD',
            status: 'Pending'
        });

        await newOrder.save();

        for (const item of cart.items) {
            await Product.findByIdAndUpdate(item.product._id, {
                $inc: { quantity: -item.quantity }
            });
        }

        await Cart.findOneAndDelete({ user: userId });

        res.json({ success: true, orderId: newOrder.orderId });

    } catch (error) {
        console.error("Order Placement Error:", error);
        res.status(500).json({ success: false, message: "Server error during order placement" });
    }
};
export const loadOrderSuccess = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findOne({ orderId: orderId });

        if (!order) {
            return res.redirect('/');
        }

        res.render('user/ordersuccess', {
            order,
            title: 'Order Confirmed'
        });
    } catch (error) {
        console.error(error);
        res.redirect('/');
    }
};
export const downloadInvoice = async (req, res) => {
    try {
        const { orderId } = req.params;
        
        const order = await Order.findOne({ orderId }).populate('items.product');

        if (!order) {
            return res.status(404).send("Order not found");
        }

        const doc = new PDFDocument({ margin: 50 });
        const filename = `Invoice_${order.orderId}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

        doc.pipe(res);

        doc.fillColor('#444444').fontSize(20).text('WEARIFY RETAILS', 50, 50);
        doc.fontSize(10).text('123 Fashion Street, Kerala, India', 50, 80);
        doc.text('Support: support@wearify.com', 50, 95);
        doc.moveDown();

        doc.fillColor('#000000').fontSize(12).text(`Invoice Number: ${order.orderId}`, 400, 50);
        doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 400, 65);
        doc.moveDown();

        doc.fontSize(14).text('Bill To:', 50, 130, { underline: true });
        doc.fontSize(10).text(order.shippingAddress.fullName, 50, 150);
        doc.text(order.shippingAddress.addressLine, 50, 165);
        doc.text(`${order.shippingAddress.city}, ${order.shippingAddress.pincode}`, 50, 180);
        doc.text(`Phone: ${order.shippingAddress.phone}`, 50, 195);

        const tableTop = 250;
        doc.fontSize(10).text('Item Description', 50, tableTop, { bold: true });
        doc.text('Size', 250, tableTop);
        doc.text('Qty', 320, tableTop);
        doc.text('Price', 400, tableTop);
        doc.text('Total', 480, tableTop);
        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

        let i = 0;
        order.items.forEach(item => {
            const y = tableTop + 30 + (i * 25);
            doc.text(item.product.productName, 50, y);
            doc.text(item.size, 250, y);
            doc.text(item.quantity.toString(), 320, y);
            doc.text(`$${item.price.toFixed(2)}`, 400, y);
            doc.text(`$${(item.price * item.quantity).toFixed(2)}`, 480, y);
            i++;
        });

        const footerTop = tableTop + 40 + (i * 25);
        doc.moveTo(350, footerTop).lineTo(550, footerTop).stroke();
        doc.fontSize(15).text(`Grand Total: $${order.totalPrice.toFixed(2)}`, 350, footerTop + 20, { color: '#2563eb' });

        doc.end();

    } catch (error) {
        console.error("Invoice Error:", error);
        res.status(500).send("Error generating invoice");
    }
};
export const getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.id;
        const order = await Order.findById(orderId).populate({
            path: 'items.product',
            model: 'Product' 
        });

        if (!order) {
            return res.status(404).render('user/404', { message: "Order not found" });
        }
        res.render('user/orderdetails', { order });
    } catch (error) {
        console.error("Error fetching order:", error);
        res.status(500).redirect('/user/orders');
    }
};
export const getMyOrders = async (req, res) => {
    try {
        const userId = req.session.user?.id || req.user;
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const searchTerm = req.query.search || "";

        let query = { user: userId };

        if (searchTerm) {
            query.orderId = { $regex: searchTerm, $options: 'i' };
        }

        const totalOrders = await Order.countDocuments(query);
        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.render('user/myorders', {
            orders,
            currentPage: page,
            totalPages: Math.ceil(totalOrders / limit),
            searchTerm 
        });
    } catch (error) {
        console.error("Search Error:", error);
        res.status(500).send("Internal Server Error");
    }
};
export const getItemDetails = async (req, res) => {
    try {
        const { orderId, productId } = req.params;

        const order = await Order.findById(orderId).populate('items.product');

        if (!order) {
            return res.status(404).render('user/404', { message: "Order not found" });
        }
        const item = order.items.find(i => i.product._id.toString() === productId);

        if (!item) {
            return res.status(404).render('user/404', { message: "Item not found in this order" });
        }
        res.render('user/order-details', { order, item });
    } catch (error) {
        console.error("Error in getItemDetails:", error);
        res.status(500).redirect('/user/orders');
    }
};
export const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.session.user?.id || req.user;
        const order = await Order.findOne({ _id: orderId, user: userId });

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }
        if (['Shipped', 'Delivered', 'Cancelled'].includes(order.status)) {
            return res.status(400).json({ 
                success: false, 
                message: `Cannot cancel an order that is already ${order.status}.` 
            });
        }
        for (const item of order.items) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { quantity: item.quantity } 
            });
        }
        order.status = 'Cancelled';
        order.items.forEach(item => {
            // Only restore stock and refund if the item wasn't already cancelled
            if (item.status !== 'Cancelled') {
                // Restore Stock
                Product.findByIdAndUpdate(item.product, { $inc: { quantity: item.quantity } }).exec();
                
                // Mark item as cancelled
                item.status = 'Cancelled';
            }
        });
        await order.save();

        res.json({ 
            success: true, 
            message: "Order has been cancelled and stock has been restored." 
        });

    } catch (error) {
        console.error("Cancel Order Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
export const getReturnPage = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('items.product');
        if (!order || order.status !== 'Delivered') {
            return res.redirect('/user/orders');
        }
        res.render('user/return-order', { order });
    } catch (error) {
        res.redirect('/user/orders');
    }
};
export const requestReturn = async (req, res) => {
    try {
        const { orderId, reason, comment } = req.body;

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        
        if (order.status !== 'Delivered') {
            return res.status(400).json({ success: false, message: "Order must be delivered to request return" });
        }

        order.status = 'Return Requested';
        order.returnDetails = {
            reason: reason,
            comment: comment,
            requestDate: new Date()
        };

        await order.save();

        res.status(200).json({ success: true, message: "Return requested successfully" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
export const requestItemReturn = async (req, res) => {
    try {
        const { orderId, itemId, reason } = req.body;
        
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const item = order.items.id(itemId);
        if (!item) {
            return res.status(404).json({ success: false, message: "Item not found" });
        }

        item.status = 'Return Requested';
        item.returnReason = reason;

        
        order.status = 'Return Requested';

        await order.save();

        res.json({ success: true, message: "Return request submitted successfully" });

    } catch (error) {
        console.error("Return Request Error:", error);
        res.status(500).json({ success: false, message: "Server error occurred" });
    }
};
export const cancelSingleItem = async (req, res) => {
    console.log("!!! THE REQUEST REACHED THE CONTROLLER !!!");
    try {
        const { orderId, itemId } = req.body;
        console.log("Cancel Request Received:", { orderId, itemId });

        const order = await Order.findById(orderId);
        if(order.status=="Shipped"){
             return res.status(400).json({ success: false, message: "Item cannot be cancelled as it is shipped" });
        }
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        const item = order.items.id(itemId);

        if (!item) {
            console.log("Item ID not found in Order items array");
            return res.status(404).json({ success: false, message: "Product not found in this order" });
        }

        if (item.status === 'Cancelled') {
            return res.status(400).json({ success: false, message: "Item is already cancelled" });
        }

        if (item.product) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { quantity: item.quantity }
            });
        }

        const isPrepaid = ['Paid', 'Online Payment', 'Wallet'].includes(order.paymentStatus) || order.paymentMethod === 'Wallet';
        
        if (isPrepaid) {
            const refundAmount = item.price * item.quantity;
            await User.findByIdAndUpdate(order.user, {
                $inc: { wallet: refundAmount },
                $push: {
                    walletHistory: {
                        amount: refundAmount,
                        type: 'Credit',
                        reason: `Cancelled: ${item.productName || 'Product'}`,
                        date: new Date()
                    }
                }
            });
        }
        const itemTotal = item.price * item.quantity;
         order.totalPrice -= itemTotal;
        
        item.status = 'Cancelled';

        await order.save();
      
item.status = 'Cancelled';

const areAllItemsCancelled = order.items.every(item => item.status === 'Cancelled');

if (areAllItemsCancelled) {
    order.status = 'Cancelled';
    console.log(`Order ${order._id} fully cancelled because all items are cancelled.`);
}


await order.save();

        res.json({ success: true, message: "Item cancelled and refund processed" });

    } catch (error) {
        console.error("DETAILED ERROR:", error); 
        res.status(500).json({ success: false, message: "Internal Server Error: " + error.message });
    }
};
export const requestFullOrderReturn = async (req, res) => {
    try {
        const { orderId, reason, comment } = req.body;
        const order = await Order.findById(orderId);

        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        // Flag every 'Delivered' item for return
        let itemsFlagged = 0;
        order.items.forEach(item => {
            if (item.status === 'Delivered') {
                item.status = 'Return Requested';
                item.returnReason = reason;
                item.returnComment = comment;
                itemsFlagged++;
            }
        });

        if (itemsFlagged === 0) {
            return res.status(400).json({ success: false, message: "No eligible items to return" });
        }

        order.status = 'Return Requested';
        await order.save();

        res.json({ success: true, message: "Full order return request submitted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
const orderController = {placeOrder,loadOrderSuccess,downloadInvoice,getOrderDetails,getMyOrders,getItemDetails,cancelOrder,getReturnPage
    ,requestReturn,requestItemReturn,cancelSingleItem,requestFullOrderReturn
}

export default orderController
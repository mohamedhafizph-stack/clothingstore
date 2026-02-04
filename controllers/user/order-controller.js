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

        for (const item of cart.items) {
            const variant = item.product.variants.find(v => v.size === item.size);
            
            if (!variant || variant.stock < item.quantity) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Stock unavailable for ${item.product.name} (Size: ${item.size}). Only ${variant ? variant.stock : 0} left.` 
                });
            }
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

        const stockUpdates = cart.items.map(item => {
            return Product.findOneAndUpdate(
                { 
                    _id: item.product._id, 
                    "variants.size": item.size 
                },
                { 
                    $inc: { 
                        "variants.$.stock": -item.quantity, 
                        "totalStock": -item.quantity 
                    } 
                }
            );
        });

        
        await Promise.all(stockUpdates);

        
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

        if (!order) return res.status(404).send("Order not found");

        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const filename = `WEARIFY_INV_${order.orderId}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        doc.pipe(res);

        // --- BRANDING HEADER ---
        // Black sidebar/topbar accent
        doc.rect(0, 0, 612, 40).fill('#000000'); 
        
        doc.fillColor('#ffffff')
           .fontSize(14)
           .text('OFFICIAL PURCHASE INVOICE', 50, 15, { characterSpacing: 2 });

        // Logo and Company Info
        doc.fillColor('#000000')
           .fontSize(24)
           .text('WEARIFY', 50, 70, { bold: true, characterSpacing: 1 });
        
        doc.fontSize(9)
           .fillColor('#777777')
           .text('WEARIFY RETAILS PVT LTD', 50, 100)
           .text('123 Fashion Street, Cyber Park, Kerala, IN')
           .text('GSTIN: 32AAAAA0000A1Z5');

        // Invoice Meta Info (Right Aligned)
        doc.fillColor('#000000')
           .fontSize(10)
           .text(`INVOICE ID: #${order.orderId}`, 400, 75, { align: 'right' })
           .text(`DATE: ${new Date(order.createdAt).toLocaleDateString()}`, 400, 90, { align: 'right' })
           .text(`STATUS: ${order.paymentStatus.toUpperCase()}`, 400, 105, { align: 'right' });

        doc.moveTo(50, 130).lineTo(550, 130).strokeColor('#eeeeee').stroke();

        // --- CLIENT & SHIPPING SECTION ---
        doc.fillColor('#000000').fontSize(10).text('BILL TO:', 50, 150, { bold: true });
        doc.fillColor('#444444')
           .text(order.shippingAddress.fullName, 50, 165)
           .text(order.shippingAddress.addressLine)
           .text(`${order.shippingAddress.city}, ${order.shippingAddress.state}`)
           .text(`PIN: ${order.shippingAddress.pincode}`)
           .text(`PH: ${order.shippingAddress.phone}`);

        // --- TABLE SECTION ---
        const tableTop = 260;
        
        // Table Header Background
        doc.rect(50, tableTop, 500, 20).fill('#f9f9f9');
        doc.fillColor('#000000').fontSize(9);
        
        doc.text('DESCRIPTION', 60, tableTop + 6);
        doc.text('SIZE', 280, tableTop + 6);
        doc.text('QTY', 340, tableTop + 6);
        doc.text('UNIT PRICE', 400, tableTop + 6);
        doc.text('TOTAL', 480, tableTop + 6, { align: 'right' });

        let i = 0;
        doc.fillColor('#444444');

        order.items.forEach(item => {
            const y = tableTop + 35 + (i * 35);
            const productName = item.product ? (item.product.name || item.product.productName) : "Archived Item";
            
            // Draw thin line between items
            if(i > 0) {
                doc.moveTo(50, y - 10).lineTo(550, y - 10).strokeColor('#f0f0f0').lineWidth(0.5).stroke();
            }

            doc.text(productName.toUpperCase(), 60, y, { width: 200 });
            doc.text(item.size, 280, y);
            doc.text(item.quantity.toString(), 340, y);
            doc.text(`$${item.price.toFixed(2)}`, 400, y);
            doc.text(`$${(item.price * item.quantity).toFixed(2)}`, 50, y, { align: 'right' });
            
            i++;
        });

        // --- SUMMARY SECTION ---
        const footerTop = tableTop + 60 + (i * 35);
        
        doc.rect(350, footerTop, 200, 80).fill('#f9f9f9');
        
        doc.fillColor('#777777').fontSize(10).text('SUBTOTAL', 370, footerTop + 15);
        doc.text(`$${order.totalPrice.toFixed(2)}`, 370, footerTop + 15, { align: 'right' });
        
        doc.text('SHIPPING', 370, footerTop + 30);
        doc.text('FREE', 370, footerTop + 30, { align: 'right' });

        doc.fillColor('#000000').fontSize(12).text('TOTAL PAID', 370, footerTop + 55, { bold: true });
        doc.text(`$${order.totalPrice.toFixed(2)}`, 370, footerTop + 55, { align: 'right', bold: true });

        // --- FOOTER NOTES ---
        doc.fontSize(8).fillColor('#aaaaaa')
           .text('Thank you for choosing WEARIFY. Goods once sold can be returned within 7 days in original condition.', 50, 750, { align: 'center' })
           .text('This is a computer generated invoice and does not require a physical signature.', 50, 765, { align: 'center' });

        doc.end();

    } catch (error) {
        console.error("PDF Gen Error:", error);
        res.status(500).send("Critical error during PDF generation.");
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
for (const item of order.items) {
    if (item.status !== 'Cancelled') {
        await Product.findOneAndUpdate(
            { 
                _id: item.product, 
                "variants.size": item.size 
            },
            { 
                $inc: { 
                    "variants.$.stock": item.quantity, 
                    "totalStock": item.quantity 
                } 
            }
        );
        item.status = 'Cancelled';
    }
}

order.status = 'Cancelled';
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
    await Product.findOneAndUpdate(
        { 
            _id: item.product, 
            "variants.size": item.size 
        },
        { 
            $inc: { 
                "variants.$.stock": item.quantity,
                "totalStock": item.quantity       
            } 
        }
    );
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
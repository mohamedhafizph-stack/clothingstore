import Order from '../../model/Orders.js';
import Cart from '../../model/cart.js';
import Address from '../../model/address.js';
import Product from '../../model/Product.js';
import PDFDocument from 'pdfkit';
import Coupon from '../../model/Coupons.js';
import Razorpay from 'razorpay';
import User from '../../model/User.js';
import crypto from 'crypto';

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const completeOrderProcessing = async (cart, userId) => {
    for (const item of cart.items) {
        await Product.findOneAndUpdate(
            { _id: item.product._id, "variants.size": item.size },
            { $inc: { "variants.$.stock": -item.quantity, "totalStock": -item.quantity } }
        );
    }
    await Cart.findOneAndDelete({ user: userId });
};

export const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user?.id || req.user?._id;
        const { addressId, couponCode,paymentMethod } = req.body;

        const [cart, addr, user] = await Promise.all([
            Cart.findOne({ user: userId }).populate('items.product'),
            Address.findById(addressId),
            User.findById(userId)
        ]);

        if (!cart || cart.items.length === 0) return res.status(400).json({ success: false, message: "Cart empty" });
        if (!addr) return res.status(400).json({ success: false, message: "Address not found" });

        const subtotal = cart.items.reduce((acc, i) => {
    const basePrice =  i.price; 
    return acc + (basePrice * i.quantity);
}, 0);
        let finalTotal = subtotal;
        
        let discount = 0;

        if (couponCode) {
            const coupon = await Coupon.findOne({ 
                code: couponCode.trim().toUpperCase(), 
                status: 'Active' 
            });
            
            if (coupon) {
                const now = new Date();
                const isNotExpired = new Date(coupon.expiryDate) >= now;
                const hasLimitLeft = coupon.usageLimit === null || coupon.usedCount < coupon.usageLimit;
                const notUsedByUser = userId ? !coupon.usersUsed.includes(userId) : true;
                const minOrderMet = subtotal >= coupon.minOrderValue;

                if (isNotExpired && hasLimitLeft && notUsedByUser && minOrderMet) {
                    if (coupon.discountType === 'Percentage') {
                        let calculatedDiscount = (subtotal * Number(coupon.discountValue)) / 100;

                        if (coupon.maxDiscount > 0 && calculatedDiscount > coupon.maxDiscount) {
                            discount = coupon.maxDiscount;
                        } else {
                            discount = calculatedDiscount;
                        }
                    } else if (coupon.discountType === 'Flat') {
                        discount = Number(coupon.discountValue);
                    }
                }
            }
        }
         finalTotal=subtotal-discount
        const newOrder = new Order({
            user: userId,
            items: cart.items.map(i => ({
                product: i.product._id,
                quantity: i.quantity,
                price: i.price,
                realPrice : i.realPrice,
                size: i.size
            })),
            shippingAddress: {
                fullName: addr.fullName,
                addressLine: addr.addressLine,
                city: addr.city,
                state: addr.state,
                pincode: addr.pincode,
                phone: addr.phone
            },
            subtotal,
            couponDiscount:discount,
            totalPrice: finalTotal,
            paymentMethod,
            paymentStatus: 'Pending',
            status: 'Pending'
        });

        if (paymentMethod === 'Razorpay') {
            try {
                const rzpOrder = await razorpay.orders.create({
                    amount: Math.round(finalTotal * 100),
                    currency: "INR",
                    receipt: `receipt_${newOrder.orderId}` 
                });

                newOrder.razorpayOrderId = rzpOrder.id;
                await newOrder.save();

                return res.status(200).json({
                    success: true,
                    paymentMethod: 'Razorpay',
                    rzpKey: process.env.RAZORPAY_KEY_ID,
                    rzpOrderId: rzpOrder.id,
                    amount: rzpOrder.amount,
                    orderId: newOrder._id 
                });
            } catch (rzpErr) {
                console.error("Razorpay SDK Error:", rzpErr);
                return res.status(500).json({ success: false, message: "Razorpay initialization failed" });
            }
        }

        if (paymentMethod === 'Wallet') {
            if (user.wallet < finalTotal) {
                return res.status(400).json({ success: false, message: "Insufficient Wallet" });
            }
            user.wallet -= finalTotal;
            await user.save();
            newOrder.paymentStatus = 'Paid';
        }

        newOrder.status = 'Processing'; 
        
        await newOrder.save();
        
        await completeOrderProcessing(cart, userId); 

        return res.status(200).json({ 
            success: true, 
            orderId: newOrder._id, 
            customOrderId: newOrder.orderId 
        });

    } catch (error) {
        console.error("FATAL ERROR IN PLACEORDER:", error);
        if (!res.headersSent) {
            return res.status(500).json({ success: false, message: "Internal Server Error" });
        }
    }
};
export const verifyPayment = async (req, res) => {
    try {
        console.log("--- Payment Verification Started ---");
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

        const secret = process.env.RAZORPAY_KEY_SECRET;
        if (!secret) {
            console.error("RAZORPAY_KEY_SECRET is missing in .env");
            return res.status(500).json({ success: false, message: "Server configuration error" });
        }

        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
        const generated_signature = hmac.digest('hex');

        if (generated_signature !== razorpay_signature) {
            console.error("Invalid Signature!");
            return res.status(400).json({ success: false, message: "Payment verification failed" });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            console.error("Order not found during verification:", orderId);
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        order.paymentStatus = 'Paid';
        order.razorpayPaymentId = razorpay_payment_id;
        order.status = 'Processing';
        await order.save();

        const cart = await Cart.findOne({ user: order.user });
        if (cart) {
            for (const item of cart.items) {
                await Product.findOneAndUpdate(
                    { _id: item.product, "variants.size": item.size },
                    { 
                        $inc: { 
                            "variants.$.stock": -item.quantity, 
                            "totalStock": -item.quantity 
                        } 
                    }
                );
            }
            await Cart.findOneAndDelete({ user: order.user });
            console.log("Stock updated and Cart cleared.");
        }

        console.log("Verification Success!");
     return res.json({ 
            success: true, 
            customOrderId: order.orderId 
        });

    } catch (error) {
        console.error("CRITICAL ERROR IN VERIFYPAYMENT:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error during verification" });
    }
};

export const loadOrderSuccess = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findOne({ orderId: orderId })
            .populate({
                path: 'items.product',
                select: 'name images price' 
            });

        if (!order) {
           
            return res.redirect('/');
        }

        if (order.paymentStatus === 'Failed') {
            return res.redirect('/user/orders');
        }

        res.render('user/ordersuccess', {
            order,
            title: 'Order Confirmed',
            user: req.session?.user?.id||req.user 
        });
    } catch (error) {
        console.error("LoadSuccessPage Error:", error);
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
    try {
        const { orderId, itemId } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        if (order.status === "Shipped") {
            return res.status(400).json({ success: false, message: "Item cannot be cancelled as it is already shipped" });
        }

        const item = order.items.id(itemId);
        if (!item) {
            return res.status(404).json({ success: false, message: "Product not found in this order" });
        }

        if (item.status === 'Cancelled') {
            return res.status(400).json({ success: false, message: "Item is already cancelled" });
        }

        const itemOriginalTotal = Number(item.price) * Number(item.quantity);
        let refundAmount = itemOriginalTotal;

        if (order.couponDiscount > 0 && order.subtotal > 0) {
            const discountRatio = order.couponDiscount / order.subtotal;
            const itemShareOfDiscount = itemOriginalTotal * discountRatio;
            refundAmount = itemOriginalTotal - itemShareOfDiscount;
        }
        
        refundAmount = Math.max(0, Number(refundAmount.toFixed(2)));

        if (item.product) {
            await Product.findOneAndUpdate(
                { _id: item.product, "variants.size": item.size },
                { 
                    $inc: { 
                        "variants.$.stock": item.quantity,
                        "totalStock": item.quantity       
                    } 
                }
            );
        }

        const isPrepaid = ['Paid', 'Completed'].includes(order.paymentStatus) || order.paymentMethod === 'Wallet' || order.paymentMethod === 'Razorpay';
        
        if (isPrepaid) {
            await User.findByIdAndUpdate(order.user, {
                $inc: { wallet: refundAmount },
                $push: {
                    walletHistory: {
                        amount: refundAmount,
                        type: 'Credit',
                        reason: `Cancelled Item Refund: ORD${order.orderId}`,
                        date: new Date()
                    }
                }
            });
        }

        order.totalPrice = Math.max(0, order.totalPrice - refundAmount);
        
        item.status = 'Cancelled';

        const areAllItemsCancelled = order.items.every(i => i.status === 'Cancelled');
        if (areAllItemsCancelled) {
            order.status = 'Cancelled';
        }

        await order.save();

        res.json({ 
            success: true, 
            message: "Item cancelled successfully", 
            refunded: isPrepaid ? refundAmount : 0 
        });

    } catch (error) {
        console.error("CANCEL_ITEM_ERROR:", error); 
        res.status(500).json({ success: false, message: "Internal Server Error" });
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
    ,requestReturn,requestItemReturn,cancelSingleItem,requestFullOrderReturn,verifyPayment
}

export default orderController
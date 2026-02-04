import Order from '../model/Orders.js';
import Cart from '../model/cart.js';
import Address from '../model/address.js';
import Product from '../model/Product.js';
import User from '../model/User.js';

export const orderService = {
    async createOrder(userId, addressId) {
        const [cart, selectedAddress] = await Promise.all([
            Cart.findOne({ user: userId }).populate('items.product'),
            Address.findById(addressId)
        ]);

        if (!cart || cart.items.length === 0) throw new Error("Cart is empty");
        if (!selectedAddress) throw new Error("Address not found");

        // Validate Stock
        for (const item of cart.items) {
            const variant = item.product.variants.find(v => v.size === item.size);
            if (!variant || variant.stock < item.quantity) {
                throw new Error(`Stock unavailable for ${item.product.name} (${item.size})`);
            }
        }

        const orderItems = cart.items.map(item => ({
            product: item.product._id,
            quantity: item.quantity,
            price: Number(item.price),
            size: item.size
        }));

        const totalAmount = orderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

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

        // Stock Deduction Logic
        const stockUpdates = cart.items.map(item => 
            Product.findOneAndUpdate(
                { _id: item.product._id, "variants.size": item.size },
                { $inc: { "variants.$.stock": -item.quantity, "totalStock": -item.quantity } }
            )
        );
        await Promise.all(stockUpdates);
        await Cart.findOneAndDelete({ user: userId });

        return newOrder;
    },

    async processItemCancellation(orderId, itemId) {
        const order = await Order.findById(orderId);
        if (!order) throw new Error("Order not found");
        if (order.status === "Shipped") throw new Error("Cannot cancel shipped items");

        const item = order.items.id(itemId);
        if (!item || item.status === 'Cancelled') throw new Error("Item already cancelled or not found");

        // Restore Stock
        await Product.findOneAndUpdate(
            { _id: item.product, "variants.size": item.size },
            { $inc: { "variants.$.stock": item.quantity, "totalStock": item.quantity } }
        );

        // Wallet Refund Logic
        const isPrepaid = ['Paid', 'Online Payment', 'Wallet'].includes(order.paymentStatus) || order.paymentMethod === 'Wallet';
        if (isPrepaid) {
            const refundAmount = item.price * item.quantity;
            await User.findByIdAndUpdate(order.user, {
                $inc: { wallet: refundAmount },
                $push: {
                    walletHistory: {
                        amount: refundAmount,
                        type: 'Credit',
                        reason: `Refund: Cancelled Item in #${order.orderId}`,
                        date: new Date()
                    }
                }
            });
        }

        order.totalPrice -= (item.price * item.quantity);
        item.status = 'Cancelled';

        if (order.items.every(i => i.status === 'Cancelled')) {
            order.status = 'Cancelled';
        }

        return await order.save();
    },

    async processReturnRequest(orderId, reason, comment, itemId = null) {
        const order = await Order.findById(orderId);
        if (!order) throw new Error("Order not found");

        if (itemId) {
            const item = order.items.id(itemId);
            if (!item) throw new Error("Item not found");
            item.status = 'Return Requested';
            item.returnReason = reason;
        } else {
            if (order.status !== 'Delivered') throw new Error("Order not delivered yet");
            order.status = 'Return Requested';
            order.returnDetails = { reason, comment, requestDate: new Date() };
            
            order.items.forEach(item => {
                if (item.status === 'Delivered') item.status = 'Return Requested';
            });
        }

        return await order.save();
    }
};
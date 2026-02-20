import User from "../../model/User.js";
import Cart from "../../model/cart.js";
import Address from "../../model/address.js";
import Coupon from "../../model/Coupons.js";
export const getCheckoutData = async (userId) => {
    const [user, cart, addresses, coupons] = await Promise.all([
        User.findById(userId),
        Cart.findOne({ user: userId }).populate('items.product'),
        Address.find({ userId: userId }),
        Coupon.find({ 
            status: 'Active', 
            expiryDate: { $gt: new Date() } 
        }).sort({ minOrderValue: 1 })
    ]);

    if (!cart || cart.items.length === 0) {
        throw new Error("Cart is empty");
    }

    const subtotal = cart.items.reduce((acc, item) => {
        const itemPrice = item.product.salePrice || item.product.price || 0;
        return acc + (item.quantity * itemPrice);
    }, 0);

    const couponsWithEligibility = coupons.map(coupon => ({
        ...coupon.toObject(),
        isEligible: subtotal >= coupon.minOrderValue
    }));

    return {
        user,
        cart,
        addresses,
        totalPrice: subtotal,
        coupons: couponsWithEligibility 
    };
};
import User from "../../model/User.js";
import Cart from "../../model/cart.js";
import Address from "../../model/address.js";

export const getCheckoutData = async (userId) => {
    const [user, cart, addresses] = await Promise.all([
        User.findById(userId),
        Cart.findOne({ user: userId }).populate('items.product'),
        Address.find({ userId: userId })
    ]);

    if (!cart || cart.items.length === 0) {
        throw new Error("Cart is empty");
    }

    const subtotal = cart.items.reduce((acc, item) => {
        const itemPrice = item.product.price || item.product.regularPrice || 0;
        return acc + (item.quantity * itemPrice);
    }, 0);

    return {
        user,
        cart,
        addresses,
        totalPrice: subtotal
    };
};
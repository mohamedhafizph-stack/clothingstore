import User from "../../model/User.js";
import Cart from "../../model/cart.js";
import Address from "../../model/address.js";

/**
 * Prepares all data required for the Checkout page.
 * Fetches user profile, cart items (populated), and user addresses in parallel.
 */
export const getCheckoutData = async (userId) => {
    const [user, cart, addresses] = await Promise.all([
        User.findById(userId),
        Cart.findOne({ user: userId }).populate('items.product'),
        Address.find({ userId: userId })
    ]);

    // Validation: If no cart exists or it's empty, we shouldn't proceed
    if (!cart || cart.items.length === 0) {
        throw new Error("Cart is empty");
    }

    // Calculate subtotal
    // Prioritize 'price' (sale price) over 'regularPrice' if your model uses both
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
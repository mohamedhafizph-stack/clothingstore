import Product from "../../model/Product.js";
import Category from "../../model/category.js";
import Cart from "../../model/cart.js";
import User from "../../model/User.js";
import Address from "../../model/address.js";



export const loadCheckoutpage = async (req, res) => {
    try {
        const userId = req.session.user?.id||req.user;

        const [user, cart, userAddresses] = await Promise.all([
            User.findById(userId),
            Cart.findOne({ user: userId }).populate('items.product'),
            Address.find({ userId: userId })
        ]);
       
        
        if (!cart || cart.items.length === 0) {
            return res.redirect('/home/cart');
        }

        
        const subtotal = cart.items.reduce((acc, item) => {
            return acc + (item.quantity * (item.product.price || item.product.regularPrice));
        }, 0);
        console.log(subtotal)
        
        res.render('user/checkout', {
            user,
            cart,
            addresses: userAddresses, 
            totalPrice: subtotal,
            title: 'Checkout'
        });

    } catch (error) {
        console.error("Checkout Load Error:", error);
        res.redirect('/shop/cart');
    }
};
const checkoutController = {loadCheckoutpage}
export default checkoutController
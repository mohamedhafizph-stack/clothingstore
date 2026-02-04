import * as checkoutService from "../../services/user/checkoutService.js";

export const loadCheckoutpage = async (req, res) => {
    try {
        const userId = req.session.user?.id || req.user;

        if (!userId) {
            return res.redirect('/login');
        }

        const data = await checkoutService.getCheckoutData(userId);

        res.render('user/checkout', {
            ...data,
            title: 'Checkout'
        });

    } catch (error) {
        console.error("Checkout Load Error:", error.message);
        
        if (error.message === "Cart is empty") {
            return res.redirect('/home/cart');
        }

        res.redirect('/home/cart');
    }
};

const checkoutController = { loadCheckoutpage };
export default checkoutController;
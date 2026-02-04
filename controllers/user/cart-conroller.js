import * as cartService from "../../services/user/cartService.js";

export const addtoCart = async (req, res) => {
    try {
        const userId = req.session.user?.id || req.user;
        if (!userId) return res.status(401).json({ success: false, message: "Please login" });

        await cartService.addToCartLogic(userId, req.body);
        res.status(200).json({ success: true, message: "Added to cart!" });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const loadCart = async (req, res) => {
    try {
        const userId = req.session.user?.id || req.user;
        if (!userId) return res.redirect('/login');

        const cart = await cartService.getCartData(userId);
        res.render('user/Cart', { cart });
    } catch (err) {
        res.status(500).send("Internal Server Error");
    }
};

export const updateCartQuantity = async (req, res) => {
    try {
        const userId = req.session.user?.id || req.user;
        await cartService.updateQuantityLogic(userId, req.body);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const cartController = { addtoCart, loadCart, updateCartQuantity };
export default cartController;
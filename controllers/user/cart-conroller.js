import Product from "../../model/Product.js";
import Category from "../../model/category.js";
import Cart from "../../model/cart.js";
import User from "../../model/User.js";



 const addtoCart = async (req, res) => {
    try {
        const { productId, size, quantity } = req.body;
        const userId = req.session.user||req.user;
        const requestedQty = parseInt(quantity);
        const MAX_LIMIT = 4;

        
        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ success: false, message: "Product not found" });

       
        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            cart = new Cart({ user: userId, items: [] });
        }

        
        const currentProductTotal = cart.items
            .filter(item => item.product.toString() === productId)
            .reduce((total, item) => total + item.quantity, 0);

        if (currentProductTotal + requestedQty > MAX_LIMIT) {
            const allowedMore = MAX_LIMIT - currentProductTotal;
            return res.status(400).json({ 
                success: false, 
                message: allowedMore > 0 
                    ? `You can only add ${allowedMore} more of this product (Limit: 4).` 
                    : `You have reached the maximum limit of 4 for this product.` 
            });
        }

       
        const existingItem = cart.items.find(
            item => item.product.toString() === productId && item.size === size
        );

        if (existingItem) {
            existingItem.quantity += requestedQty;
        } else {
            cart.items.push({
                product: productId,
                size: size,
                quantity: requestedQty,
                price: product.price
            });
        }

        await cart.save();
        res.status(200).json({ success: true, message: "Added to cart!" });

    } catch (error) {
        console.error("Cart Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const cartController = {addtoCart}
export default cartController
import Product from "../../model/Product.js";
import Category from "../../model/category.js";
import Cart from "../../model/cart.js";
import User from "../../model/User.js";

 const addtoCart = async (req, res) => {
    try {
        const { productId, size, quantity } = req.body;
        const userId = req.session.user?._id||req.user;
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
const loadCart = async (req, res) => {
    try {
        const userId = req.session.user?._id|| req.user;

        if (!userId) {
            return res.redirect('/login');
        }

        
        let cart = await Cart.findOne({ user: userId }).populate('items.product');

       
        if (!cart) {
            return res.render('user/Cart', { cart: { items: [], totalPrice: 0 } });
        }

        const subtotal = cart.items.reduce((acc, item) => {
            return acc + (item.price * item.quantity);
        }, 0);

        
        cart.totalPrice = subtotal;

        res.render('user/Cart', { cart });
        

    } catch (err) {
        console.error("Load Cart Error:", err);
        res.status(500).send("Internal Server Error");
    }
}
 const updateCartQuantity = async (req, res) => {
    try {
        const { productId, size, change } = req.body;
        const userId = req.session.user?._id||req.user;

        const [cart, product] = await Promise.all([
            Cart.findOne({ user: userId }),
            Product.findById(productId)
        ]);

        if (!cart || !product) {
            return res.status(404).json({ success: false, message: "Resource not found" });
        }

        const sizeVariant = product.variants.find(v => v.size === size);
        
        if (!sizeVariant) {
            return res.status(400).json({ success: false, message: "Size not found for this product." });
        }

        const availableStock = sizeVariant.stock;

        const itemIndex = cart.items.findIndex(
            item => item.product.toString() === productId && item.size === size
        );

        if (itemIndex > -1) {
            const currentQty = Number(cart.items[itemIndex].quantity);
            const newQuantity = currentQty + Number(change);

            if (change > 0) {
                if (newQuantity > availableStock) {
                    return res.status(400).json({ 
                        success: false, 
                        message: `Only ${availableStock} items left in size ${size}.` 
                    });
                }
                if (newQuantity > 4) {
                    return res.status(400).json({ success: false, message: "Maximum limit is 4 units." });
                }
            }

            if (newQuantity <= 0) {
                cart.items.splice(itemIndex, 1);
            } else {
                cart.items[itemIndex].quantity = newQuantity;
            }

            cart.totalPrice = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);

            await cart.save();
            return res.json({ success: true });
        }
    } catch (error) {
        console.error("Update Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const cartController = {addtoCart,loadCart,updateCartQuantity}
export default cartController
import Cart from "../../model/cart.js";
import Product from "../../model/Product.js";

const MAX_LIMIT = 4;

export const addToCartLogic = async (userId, { productId, size, quantity }) => {
    const requestedQty = parseInt(quantity);
    
    const product = await Product.findById(productId);
    if (!product) throw new Error("Product not found");

    let cart = await Cart.findOne({ user: userId }) || new Cart({ user: userId, items: [] });

    // Check total quantity limit for this product across all sizes
    const currentProductTotal = cart.items
        .filter(item => item.product.toString() === productId)
        .reduce((total, item) => total + item.quantity, 0);

    if (currentProductTotal + requestedQty > MAX_LIMIT) {
        const allowedMore = MAX_LIMIT - currentProductTotal;
        throw new Error(allowedMore > 0 
            ? `Limit: 4. You can only add ${allowedMore} more.` 
            : `Maximum limit of 4 reached for this product.`);
    }

    const existingItem = cart.items.find(
        item => item.product.toString() === productId && item.size === size
    );

    if (existingItem) {
        existingItem.quantity += requestedQty;
    } else {
        cart.items.push({
            product: productId,
            size,
            quantity: requestedQty,
            price: product.price
        });
    }

    return await cart.save();
};

export const getCartData = async (userId) => {
    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    if (!cart) return { items: [], totalPrice: 0 };

    const subtotal = cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    cart.totalPrice = subtotal;
    return cart;
};

export const updateQuantityLogic = async (userId, { productId, size, change }) => {
    const [cart, product] = await Promise.all([
        Cart.findOne({ user: userId }),
        Product.findById(productId)
    ]);

    if (!cart || !product || product.status !== "Active") throw new Error("Resource unavailable");

    const sizeVariant = product.variants.find(v => v.size === size);
    if (!sizeVariant) throw new Error("Size not found");

    const itemIndex = cart.items.findIndex(
        item => item.product.toString() === productId && item.size === size
    );

    if (itemIndex === -1) throw new Error("Item not in cart");

    const newQuantity = Number(cart.items[itemIndex].quantity) + Number(change);

    if (change > 0) {
        if (newQuantity > sizeVariant.stock) throw new Error(`Only ${sizeVariant.stock} left.`);
        if (newQuantity > MAX_LIMIT) throw new Error("Maximum limit is 4 units.");
    }

    if (newQuantity <= 0) {
        cart.items.splice(itemIndex, 1);
    } else {
        cart.items[itemIndex].quantity = newQuantity;
    }

    cart.totalPrice = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    return await cart.save();
};
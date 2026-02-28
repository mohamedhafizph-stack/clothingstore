import Cart from "../../model/cart.js";
import Product from "../../model/Product.js";

const MAX_LIMIT = 4;

export const addToCartLogic = async (userId, { productId, size, quantity }) => {
    const requestedQty = parseInt(quantity);
    const MAX_LIMIT = 4; 
    
const product = await Product.findOne({ 
    _id: productId, 
    status: "Active" 
});    if (!product) throw new Error("Product not found");

    const effectivePrice = (product.salePrice && product.salePrice < product.price) 
        ? product.salePrice 
        : (product.price || product.price);

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
        cart = new Cart({ user: userId, items: [] });
    }

    const currentProductTotal = cart.items
        .filter(item => item.product.toString() === productId)
        .reduce((total, item) => total + item.quantity, 0);

    if (currentProductTotal + requestedQty > MAX_LIMIT) {
        const allowedMore = MAX_LIMIT - currentProductTotal;
        throw new Error(allowedMore > 0 
            ? `Limit: 4 per product. You can only add ${allowedMore} more.` 
            : `Maximum limit of 4 reached for this product.`);
    }
    const realPrice = product.price
    const existingItem = cart.items.find(
        item => item.product.toString() === productId && item.size === size
    );

    if (existingItem) {
        existingItem.quantity += requestedQty;
        existingItem.price = effectivePrice; 
        existingItem.realPrice=product.price
    } else {
        cart.items.push({
            product: productId,
            size,
            quantity: requestedQty,
            price: effectivePrice,
            realPrice : realPrice
        });
    }

    cart.totalPrice = cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    return await cart.save();
};

export const getCartData = async (userId) => {
    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    
    if (!cart || !cart.items.length) {
        return { items: [], totalPrice: 0, totalSavings: 0, originalSubtotal: 0 };
    }

    let actualTotal = 0;     
    let originalSubtotal = 0; 

    cart.items.forEach(item => {
        const qty = Number(item.quantity) || 0;
        
        const liveSalePrice = Number(item.product.salePrice) || Number(item.product.price);
        const liveRegularPrice = Number(item.product.regularPrice) || liveSalePrice;

        actualTotal += liveSalePrice * qty;
        originalSubtotal += liveRegularPrice * qty;
    });

    const cartObj = cart.toObject();
    cartObj.totalPrice = actualTotal;        
    cartObj.originalSubtotal = originalSubtotal; 
    cartObj.totalSavings = originalSubtotal - actualTotal; 

    return cartObj;
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
import Cart from "../../model/cart.js";
import Product from "../../model/Product.js";
import Wishlist from "../../model/wishlist.js";

export const getWishlistData = async (userId) => {
    const wishlist = await Wishlist.findOne({user:userId}).populate('items.product')
        if (!wishlist) return { items: []};
   
    return wishlist
}

export const addTowishlistLogic = async (userId, { productId }) => {
const product = await Product.findOne({ 
    _id: productId, 
    status: "Active" 
});    if (!product) throw new Error("Product not found");

    let wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
        wishlist = new Wishlist({ user: userId, items: [] });
    }

    const isExisting = wishlist.items.some(item => item.product.toString() === productId);
    
    if (isExisting) {
        return { alreadyExists: true };
    }

    wishlist.items.push({ product: productId });

    return await wishlist.save();
};

export const removeItemFromWishlistLogic = async (userId, productId) => {
    
   return await Wishlist.findOneAndUpdate(
        { user: userId },
        { 
            $pull: { 
                items: { product: productId } 
            } 
        },
        { new: true }
    );

    
};
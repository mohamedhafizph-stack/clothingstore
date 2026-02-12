import * as wishlistService from "../../services/user/wishlistService.js"
export const loadWishlistPage = async (req,res)=>{
    const userId = req.session.user?.id || req.user
    const wishlist = await wishlistService.getWishlistData(userId)
    res.render('user/wishlist',{wishlist})
}
export const addTowishlist = async (req, res) => {
    try {
        const { productId } = req.body; 
        const userId = req.session.user?.id||req.user

        const result = await wishlistService.addTowishlistLogic(userId, { productId });

        return res.json({ success: true, message: "Added to wishlist" });
    } catch (error) {
        console.error("DEBUG ERROR:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const removeItem = async (req, res) => {
    try {
        const productId = req.params.product__id;
        const userId = req.session.user?.id||req.user;

        await wishlistService.removeItemFromWishlistLogic(userId, productId);

        return res.json({ 
            success: true, 
            message: "Item removed from wishlist" 
        });
    } catch (error) {
        console.error("Remove Error:", error.message);
        return res.status(500).json({ 
            success: false, 
            message: error.message || "Failed to remove item" 
        });
    }
};
const wishlistController = {loadWishlistPage,addTowishlist,removeItem}
export default wishlistController
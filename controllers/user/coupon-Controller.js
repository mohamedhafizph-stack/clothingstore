import Coupon from "../../model/Coupons.js";

export const applyCoupon = async (req, res) => {
    try {
        const { code, subtotal } = req.body;
        
        const userId = req.user ? req.user._id : null;

        if (!subtotal || isNaN(subtotal)) {
            return res.status(400).json({ success: false, message: "Invalid subtotal provided." });
        }

        const coupon = await Coupon.findOne({ 
            code: code.trim().toUpperCase(), 
            status: 'Active' 
        });

        if (!coupon) {
            return res.json({ success: false, message: "Invalid or inactive coupon code." });
        }

        if (new Date(coupon.expiryDate) < new Date()) {
            return res.json({ success: false, message: "This coupon has expired." });
        }

        if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
            return res.json({ success: false, message: "This coupon has reached its maximum usage limit." });
        }

        if (userId && coupon.usersUsed.includes(userId)) {
            return res.json({ success: false, message: "You have already used this coupon code." });
        }

        if (subtotal < coupon.minOrderValue) {
            return res.json({ 
                success: false, 
                message: `Minimum order of ₹${coupon.minOrderValue} required. Add ₹${(coupon.minOrderValue - subtotal).toFixed(2)} more.` 
            });
        }

        let discount = 0;
        if (coupon.discountType === 'Percentage') {
            discount = (subtotal * coupon.discountValue) / 100;
            
            if (coupon.maxDiscount > 0 && discount > coupon.maxDiscount) {
                discount = coupon.maxDiscount;
            }
        } else if (coupon.discountType === 'Flat') {
            discount = coupon.discountValue;
        }

        if (discount > subtotal) discount = subtotal;

        const newTotal = subtotal - discount;

        return res.json({
            success: true,
            discount: parseFloat(discount.toFixed(2)),
            newTotal: parseFloat(newTotal.toFixed(2)),
            message: "Coupon applied successfully!"
        });

    } catch (error) {
        console.error("APPLY_COUPON_ERROR:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const couponApplyController = {applyCoupon}
export default couponApplyController
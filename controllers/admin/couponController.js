import * as couponService from '../../services/admin/couponService.js';
import Coupon from '../../model/Coupons.js';

export const loadCoupons = async (req, res) => {
    try {
        const statusOptions = ['Active', 'Expired', 'Blocked']; 
        
        const queryData = {
            search: req.query.search || '',
            status: req.query.status || 'all',
            page: parseInt(req.query.page) || 1
        };

        const result = await couponService.getCoupons(queryData);

        res.render('admin/coupon-managment', {
            coupons: result.coupons,
            totalPages: result.totalPages,
            currentPage: result.currentPage,
            search: queryData.search,
            currentStatus: queryData.status,
            statusOptions,
            activePage: 'coupons'
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error loading coupons");
    }
}

export const loadAddCoupon = async (req,res)=>{
    res.render('admin/add-coupons')
}

export const addCoupon = async (req,res) => {
    const {code,discountType,discountValue,minOrderValue,maxDiscount,expiryDate,usageLimit} = req.body
    await couponService.addCouponLogic(code,discountType,discountValue,minOrderValue,maxDiscount,expiryDate,usageLimit)
    res.redirect('/admin/coupons')
}

export const toggleStatus = async (req, res) => {
    try {
        const { id } = req.params;
        let { status } = req.body; 

        if (status === 'Active') {
            const coupon = await Coupon.findById(id);
            if (new Date(coupon.expiryDate) <= new Date()) {
                status = 'Expired';
            }
        }

        await Coupon.findByIdAndUpdate(id, { status: status });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const loadEditCoupon = async (req,res) => {
    const {id} = req.params
    const coupon = await couponService.getEditCoupon(id)
    res.render('admin/edit-coupon',{coupon})

}

export const updateCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        const newExpiryDate = new Date(updateData.expiryDate);
        const now = new Date();

        if (newExpiryDate > now) {
            updateData.status = 'Active';
        } else {
            updateData.status = 'Expired';
        }

        const updated = await Coupon.findByIdAndUpdate(
            id, 
            { $set: updateData }, 
            { new: true, runValidators: true }
        );

        if (updated) {
            res.json({ success: true, message: "Coupon updated successfully!" });
        } else {
            res.json({ success: false, message: "Coupon not found" });
        }
    } catch (error) {
        console.error("Update Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
const couponController = {loadCoupons,loadAddCoupon,addCoupon,toggleStatus,loadEditCoupon,updateCoupon}
export default couponController
import Coupon from "../../model/Coupons.js";
export const getCoupons = async (queryData) => {
    const { search, status, page = 1, limit = 2 } = queryData;
    const skip = (page - 1) * limit;

    let query = {};

    if (search) {
        query.code = { $regex: search, $options: 'i' }; 
    }

    if (status && status !== 'all') {
        query.status = status;
    }

    const [coupons, totalCoupons] = await Promise.all([
        Coupon.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Coupon.countDocuments(query)
    ]);

    return {
        coupons,
        totalPages: Math.ceil(totalCoupons / limit),
        currentPage: parseInt(page),
        totalCoupons
    };
};
export const addCouponLogic = async (code,discountType,discountValue,minOrderValue,maxDiscount,expiryDate,usageLimit)=>{
    let codetocheck = code.toUpperCase()
  let unique = await Coupon.findOne({code:codetocheck})
  if(unique){
    console.log('already exist')
  }
  return await Coupon.create({code:codetocheck,discountType:discountType,discountValue:discountValue,minOrderValue:minOrderValue,
    maxDiscount:maxDiscount,expiryDate:expiryDate,usageLimit:usageLimit
  })
}

export const getEditCoupon = async(Id)=>{
    return await Coupon.findById(Id)
} 
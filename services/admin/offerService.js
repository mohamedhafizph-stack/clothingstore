import Product from "../../model/Product.js"
import Category from "../../model/category.js"
import Offer from "../../model/Offer.js"
import mongoose from "mongoose";
export const loadOfferPage = async (queryParams) => {
    try {
        const { search, type, status, page = 1 } = queryParams;
        const limit = 7; 
        const skip = (page - 1) * limit;
        
        const now = new Date();

        let query = {};
        
        if (search) {
            query.offerName = { $regex: search, $options: 'i' };
        }
        
        if (type && type !== 'all') {
            query.offerType = type;
        }

        if (status === 'active') {
            query.isActive = true;
            query.expireAt = { $gt: now }; 
        } else if (status === 'expired') {
            query.$or = [
                { isActive: false },
                { expireAt: { $lte: now } }
            ];
        }

        const offers = await Offer.find(query)
            .populate('productId', 'name')
            .populate('categoryId', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalOffers = await Offer.countDocuments(query);
        const totalPages = Math.ceil(totalOffers / limit) || 1; 

        const products = await Product.find({ status: "Active" }, 'name');
        const categories = await Category.find({ status: "active" }, 'name');

       return { 
            offers, 
            products, 
            categories, 
            currentPage: parseInt(page), 
            totalPages,
            search: search || '',
            type: type || 'all',
            status: status || 'all'
        };
    } catch (error) {
        console.error("Service Error - loadOfferPage:", error);
        throw error;
    }
};
export const updateProductPrices = async (query) => {
    const now = new Date();
    const affectedProducts = await Product.find(query);

    return Promise.all(affectedProducts.map(async (product) => {
        let pDisc = 0;
        let cDisc = 0;

        const bestProductOffer = await Offer.findOne({
            productId: product._id,
            isActive: true,
            expireAt: { $gte: now }
        }).sort({ discountPercentage: -1 });
        pDisc = bestProductOffer ? bestProductOffer.discountPercentage : 0;

        if (product.category) {
            const bestCategoryOffer = await Offer.findOne({
                categoryId: product.category,
                isActive: true,
                expireAt: { $gte: now }
            }).sort({ discountPercentage: -1 });
            cDisc = bestCategoryOffer ? bestCategoryOffer.discountPercentage : 0;
        }

        const finalDiscount = Math.max(pDisc, cDisc);
        
        product.offerPercentage = finalDiscount;
        product.salePrice = Math.round(product.regularPrice * (1 - finalDiscount / 100));
        
        return product.save();
    }));
};

export const createOffer = async (offerData) => {
    const newOffer = new Offer({
        offerName: offerData.name,
        offerType: offerData.offerType,
        discountPercentage: Number(offerData.discount),
        expireAt: new Date(offerData.expiryDate),
        isActive: true,
        productId: offerData.offerType === 'Product' ? offerData.productId : null,
        categoryId: offerData.offerType === 'Category' ? offerData.categoryId : null
    });

    await newOffer.save();

    const query = offerData.offerType === 'Product' 
        ? { _id: offerData.productId } 
        : { category: offerData.categoryId };
    
    await updateProductPrices(query);
    return newOffer;
};

export const removeOffer = async (offerId) => {
    const offer = await Offer.findById(offerId);
    if (!offer) throw new Error("Offer not found");

    const query = offer.offerType === 'Product' 
        ? { _id: offer.productId } 
        : { category: offer.categoryId };

    await Offer.findByIdAndDelete(offerId);
    await updateProductPrices(query);
};

export const updateOffer = async (offerId, updateData) => {
    const oldOffer = await Offer.findById(offerId);
    if (!oldOffer) throw new Error("Offer not found");

    const updatedFields = {
        offerName: updateData.name,
        offerType: updateData.offerType,
        discountPercentage: Number(updateData.discount),
        expireAt: new Date(updateData.expiryDate),
        productId: updateData.offerType === 'Product' ? updateData.productId : null,
        categoryId: updateData.offerType === 'Category' ? updateData.categoryId : null
    };

    const updatedOffer = await Offer.findByIdAndUpdate(offerId, updatedFields, { new: true });

    const oldQuery = oldOffer.offerType === 'Product' 
        ? { _id: oldOffer.productId } 
        : { category: oldOffer.categoryId };
    await updateProductPrices(oldQuery);

    const newQuery = updatedOffer.offerType === 'Product' 
        ? { _id: updatedOffer.productId } 
        : { category: updatedOffer.categoryId };
    
    await updateProductPrices(newQuery);

    return updatedOffer;
};

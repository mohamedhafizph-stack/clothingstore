import mongoose from "mongoose";
const offerSchema = new mongoose.Schema({
    offerName: { type: String, required: true },
    discountPercentage: { type: Number, required: true, min: 0, max: 99 },
    offerType: { 
        type: String, 
        enum: ['Product', 'Category'], 
        required: true 
    },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    
    expireAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

const Offer = mongoose.model('Offer', offerSchema);
export default Offer
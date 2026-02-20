import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true 
    },
    discountType: {
        type: String,
        required: true,
        enum: ['Percentage', 'Flat'], 
        default: 'Percentage'
    },
    discountValue: {
        type: Number,
        required: true,
        min: 1
    },
    minOrderValue: {
        type: Number,
        required: true,
        default: 0
    },
    maxDiscount: {
        type: Number, 
        default: 0
    },
    expiryDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['Active', 'Blocked', 'Expired'], 
        default: 'Active'
    },
    usageLimit: {
        type: Number,
        default: null 
    },
    usedCount: {
        type: Number,
        default: 0
    },
    usersUsed: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { timestamps: true });

couponSchema.pre('save', function(next) {
    if (this.expiryDate < new Date()) {
        this.status = 'Expired';
    }
});

const Coupon = mongoose.model('Coupon', couponSchema);
export default Coupon;
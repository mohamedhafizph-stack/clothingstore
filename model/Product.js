import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema({
  size: { type: String, required: true, uppercase: true, trim: true },
  stock: { type: Number, required: true, min: 0, default: 0 }
});
const reviewSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  
  category: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category', 
    required: true 
  },
  reviews: [reviewSchema],
  price: { type: Number, required: true, min: 0 },
  
  regularPrice: { type: Number }, 
  salePrice: { type: Number, default: 0 }, 
  offerPercentage: { type: Number, default: 0 },
  
  discount: { type: Number, default: 0, min: 0, max: 100 },
  description: { type: String, trim: true },
  images: { type: [String], required: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  variants: [variantSchema], 
  totalStock: { type: Number, default: 0 }
}, { timestamps: true });

productSchema.pre('save', function(next) {
  if (this.variants && this.variants.length > 0) {
    this.totalStock = this.variants.reduce((acc, curr) => acc + curr.stock, 0);
  } else {
    this.totalStock = 0;
  }

  if (!this.regularPrice) {
    this.regularPrice = this.price;
  }
  
  if (!this.salePrice || this.salePrice === 0) {
    this.salePrice = this.price;
  }
  
});

const Product = mongoose.model('Product', productSchema);
export default Product;
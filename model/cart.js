import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  size: { type: String, enum: ["S", "M", "L", "XL", "XXL"], required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
  realPrice: {type:Number,required:true}
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  items: [cartItemSchema]
}, { timestamps: true });

export default mongoose.model("Cart", cartSchema);

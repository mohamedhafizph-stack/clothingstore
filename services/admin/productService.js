import Product from "../../model/Product.js";
import Category from "../../model/category.js";
import mongoose from 'mongoose'; 
export const getProductsList = async (query, page, limit) => {
    const skip = (page - 1) * limit;
    const [products, totalProducts] = await Promise.all([
        Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Product.countDocuments(query)
    ]);

    return {
        products,
        totalPages: Math.ceil(totalProducts / limit),
        totalProducts
    };
};

export const createNewProduct = async (productData, files) => {
    const { name, category, price, discount, description } = productData;
    
    if (!name || !category || !price) {
        throw new Error("Product Name, Category, and Price are required.");
    }

    if (Number(price) <= 0) {
        throw new Error("Price must be a positive number.");
    }

    if (!mongoose.Types.ObjectId.isValid(category)) {
        throw new Error("Invalid Category ID. Please select a valid category.");
    }

    const imageUrls = files ? files.map(file => file.path) : [];

    const product = new Product({
        name,
        category, 
        price: Number(price),
        discount: Number(discount) || 0,
        description,
        images: imageUrls,
        variants: [],
        totalStock: 0,
    });

    return await product.save();
};

export const updateProductDetails = async (id, updateData, files) => {
    const { name, category, price, discount, description } = updateData;

    if (!name || !category || !price) {
        throw new Error("Product Name, Category, and Price are required.");
    }
    if (Number(price) <= 0) throw new Error("Price must be positive");

    const categoryDoc = await Category.findOne({ name: category });
    if (!categoryDoc) throw new Error("Selected category not found.");

    let finalImages = [];
    const existing = Array.isArray(updateData.existingImages) 
        ? updateData.existingImages 
        : [updateData.existingImages];
    let fileIdx = 0;
    for (let i = 0; i < 4; i++) {
        if (files && files[i]) {
            finalImages.push(files[i].path);
        } else if (existing[i]) {
            finalImages.push(existing[i]);
        }
    }

    const regPrice = Number(price);
    const disc = Number(discount) || 0;
    const sPrice = regPrice - (regPrice * (disc / 100));

    const updateBody = {
        name: name.trim(),
        category: categoryDoc._id, 
        price: regPrice,
        regularPrice: regPrice,
        salePrice: Math.round(sPrice),
        discount: disc,
        description: description,
        images: finalImages.filter(img => img !== "") 
    };


    const updatedProduct = await Product.findByIdAndUpdate(
        id, 
        { $set: updateBody }, 
        { new: true, runValidators: true }
    );

    if (updatedProduct.variants) {
        updatedProduct.totalStock = updatedProduct.variants.reduce((acc, v) => acc + v.stock, 0);
        await updatedProduct.save();
    }

    return updatedProduct;
};

export const updateVariantStock = async (id, size, stock) => {
    const product = await Product.findById(id);
    if (!product) throw new Error("Product not found");

    const quantity = Number(stock);
    const variantIndex = product.variants.findIndex(v => v.size === size.toUpperCase());

    if (variantIndex > -1) {
        product.variants[variantIndex].stock += quantity;
    } else {
        product.variants.push({ size: size.toUpperCase(), stock: quantity });
    }

    product.totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
    return await product.save();
};

export const deleteVariant = async (productId, variantId) => {
    const product = await Product.findById(productId);
    product.variants.pull({ _id: variantId });
    product.totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
    return await product.save();
};

export const editVariantSpecific = async (productId, variantId, newStock) => {
    await Product.updateOne(
        { _id: productId, "variants._id": variantId },
        { $set: { "variants.$.stock": parseInt(newStock) } }
    );
    
    const product = await Product.findById(productId);
    product.totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
    return await product.save();
};

export const toggleStatus = async (id) => {
    const product = await Product.findById(id);
    product.status = product.status === "Active" ? "Inactive" : "Active";
    return await product.save();
};
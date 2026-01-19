import Category from "../../model/category.js"
import Product from "../../model/Product.js"
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

export const loadProduct = async (req, res) => {
    try {
        const { category, search } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = 8; 
        const skip = (page - 1) * limit;

        let query = {};
        if (category) query.category = category;
        if (search) query.name = { $regex: search, $options: 'i' };

        
        const totalProducts = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);

       
        const products = await Product.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const categories = await Category.find({ status: "active" });

        res.render("admin/product-managment", {
            products,
            categories,
            selectedCategory: category || "",
            searchQuery: search || "",
            currentPage: page,
            totalPages: totalPages
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
};
export const loadaddProduct = async (req,res)=>{
    try{
        const categories = await Category.find({status:"active"})
      res.render('admin/add-products',{categories,error:null})
    }catch(err){

    }
}



export const addProduct = async (req, res) => {
  try {
    const { name, category, price, discount, description } = req.body;
    const categories = await Category.find({ status: "Active" });

    
    if (!name || !category || !price) {
      return res.render("admin/add-products", {
        error: "Product Name, Category, and Price are required.",
        categories,
      });
    }

    
    const imageUrls = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        imageUrls.push(file.path); 
      }
    }

    
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

    await product.save();
    res.redirect("/admin/products");

  } catch (error) {
    console.error("Add product error:", error);

    const categories = await Category.find({ status: "Active" });
    res.render("admin/add-products", {
      error: "Failed to add product.",
      categories,
    });
  }
};

export const getManageStock = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.redirect('/admin/products');
        
        res.render("admin/manage-stock", { product });
    } catch (error) {
        console.error(error);
        res.redirect("/admin/products");
    }
};

export const updateStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { size, stock } = req.body;
        const quantity = Number(stock);

        const product = await Product.findById(id);

        const variantIndex = product.variants.findIndex(v => v.size === size.toUpperCase());

        if (variantIndex > -1) {
            product.variants[variantIndex].stock += quantity;
        } else {
            product.variants.push({ size: size.toUpperCase(), stock: quantity });
        }

        await product.save();

        res.redirect(`/admin/products/manage-stock/${id}`);
    } catch (error) {
        console.error("Stock update error:", error);
        res.redirect("/admin/products");
    }
};

export const loadeditProduct = async(req,res)=>{
    try{
         const{id}=req.params
         const product = await Product.findById(id)
         const categories = await Category.find({status:"active"})
         res.render('admin/edit-product',{product,categories})
    }catch(err){

    }
}


export const editProduct = async (req, res) => {
  try {
    const {
      existingImages,
      name,
      category,
      price,
      discount,
      description,
      status,
    } = req.body;

    
    let finalImages = [];

    if (existingImages) {
      finalImages = Array.isArray(existingImages)
        ? existingImages.filter(img => img)
        : [existingImages].filter(img => img);
    }

   
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => file.path); 
      finalImages = [...finalImages, ...newImages];
    }

   
    await Product.findByIdAndUpdate(req.params.id, {
      name,
      category,
      price: Number(price),
      discount: Number(discount) || 0,
      description,
      status,
      images: finalImages, 
    });

    res.redirect("/admin/products");
  } catch (error) {
    console.error("Edit product error:", error);
    res.redirect("/admin/products");
  }
};


export const productStatus = async (req,res) => { 
   const {id} = req.params
   const product = await Product.findById(id)
   if(product.status=="Active"){
    await Product.findByIdAndUpdate(id,{status:"Inactive"})
    return res.redirect('/admin/products')
   }

    await Product.findByIdAndUpdate(id,{status:"Active"})
    return res.redirect('/admin/products')
   
}

export const removeStock = async (req, res) => {
    try {
        const { productId, variantId } = req.params;
        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            { $pull: { variants: { _id: variantId } } },
            { new: true }
        );

        const newTotal = updatedProduct.variants.reduce((sum, v) => sum + v.stock, 0);
        updatedProduct.totalStock = newTotal;
        await updatedProduct.save();

        res.redirect(`/admin/products/manage-stock/${productId}`);
    } catch (error) {
        console.error("Remove Variant Error:", error);
        res.status(500).send("Internal Server Error");
    }
};
const productController = {
    loadProduct,loadaddProduct,addProduct,getManageStock,updateStock,
    loadeditProduct,editProduct,productStatus,removeStock
}
export default productController
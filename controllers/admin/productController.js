import Category from "../../model/category.js"
import Product from "../../model/Product.js"
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

export const loadProduct = async (req, res) => {
    try {
        const { category, search } = req.query;
        const page = parseInt(req.query.page) || 1; // Current page number
        const limit = 8; // Number of products per page
        const skip = (page - 1) * limit;

        let query = {};
        if (category) query.category = category;
        if (search) query.name = { $regex: search, $options: 'i' };

        // 1. Get total count for pagination calculations
        const totalProducts = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);

        // 2. Fetch only the required slice of products
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

    // 1. Basic Validation
    if (!name || !category || !price) {
      return res.render("admin/add-products", {
        error: "Product Name, Category, and Price are required.",
        categories
      });
    }

    const processedImages = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const filename = `prod-${Date.now()}-${file.originalname}`;
        const outputPath = path.join('public/uploads', filename);

       
        await sharp(file.path)
          .resize(600, 600, {
            fit: 'cover',
            position: 'center'
          })
          .toFormat('jpeg')
          .jpeg({ quality: 80 })
          .toFile(outputPath);

        
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }

        processedImages.push(filename);
      }
    }

   
    const product = new Product({
      name,
      category,
      price: Number(price),
      discount: Number(discount) || 0,
      description,
      images: processedImages, 
      variants: [], 
      totalStock: 0  
    });

    await product.save();
    res.redirect("/admin/products");

  } catch (error) {
    console.error("Add product error:", error);
    
    const categories = await Category.find({ status: "Active" });
    res.render("admin/add-products", { 
        error: "Failed to process images or save product.", 
        categories 
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
        const { existingImages, name, category, price, discount, description, status } = req.body;
        
        
        let finalImages = Array.isArray(existingImages) 
            ? existingImages.filter(img => img !== "") 
            : [existingImages].filter(img => img !== "");

        
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const filename = `upd-${Date.now()}-${file.originalname}`;
                await sharp(file.path)
                    .resize(600, 600)
                    .toFile(`public/uploads/${filename}`);
                
                finalImages.push(filename);
            }
        }

        await Product.findByIdAndUpdate(req.params.id, {
            name, category, price, discount, description, status,
            images: finalImages
        });

        res.redirect("/admin/products");
    } catch (error) {
        console.error(error);
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
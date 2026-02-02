import * as productService from "../../services/admin/productService.js";
import Category from "../../model/category.js";
import Product from "../../model/Product.js";

export const loadProduct = async (req, res) => {
    try {
        const { category, search } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = 8;

        let query = {};
        if (category) query.category = category;
        if (search) query.name = { $regex: search, $options: 'i' };

        const { products, totalPages } = await productService.getProductsList(query, page, limit);
        const categories = await Category.find({ status: "active" });

        res.render("admin/product-managment", {
            products,
            categories,
            selectedCategory: category || "",
            searchQuery: search || "",
            currentPage: page,
            totalPages
        });
    } catch (error) {
        res.status(500).send("Server Error");
    }
};

export const addProduct = async (req, res) => {
    try {
        await productService.createNewProduct(req.body, req.files);
        res.redirect("/admin/products");
    } catch (error) {
        const categories = await Category.find({ status: "active" });
        res.render("admin/add-products", { error: error.message, categories });
    }
};

export const updateStock = async (req, res) => {
    try {
        const { size, stock } = req.body;
        await productService.updateVariantStock(req.params.id, size, stock);
        res.redirect(`/admin/products/manage-stock/${req.params.id}`);
    } catch (error) {
        res.redirect("/admin/products");
    }
};

export const editProduct = async (req, res) => {
    try {
        await productService.updateProductDetails(req.params.id, req.body, req.files);
        res.redirect("/admin/products");
    } catch (error) {
        res.redirect("/admin/products");
    }
};

export const productStatus = async (req, res) => {
    try {
        await productService.toggleStatus(req.params.id);
        res.redirect('/admin/products');
    } catch (error) {
        res.redirect('/admin/products');
    }
};


const productController = {
    loadProduct, addProduct, updateStock, editProduct, productStatus,
    loadaddProduct: async (req, res) => res.render('admin/add-products', { categories: await Category.find({status:"active"}), error: null }),
    getManageStock: async (req, res) => res.render("admin/manage-stock", { product: await Product.findById(req.params.id) }),
    loadeditProduct: async (req, res) => res.render('admin/edit-product', { product: await Product.findById(req.params.id), categories: await Category.find({status:"active"}) }),
    removeStock: async (req, res) => {
        await productService.deleteVariant(req.params.productId, req.params.variantId);
        res.redirect(`/admin/products/manage-stock/${req.params.productId}`);
    },
    editStock: async (req, res) => {
        await productService.editVariantSpecific(req.params.productId, req.params.variantId, req.body.stock);
        res.redirect(`/admin/products/manage-stock/${req.params.productId}`);
    }
};

export default productController;
import * as categoryService from "../../services/admin/categoryService.js";

const loadCategory = async (req, res) => {
    try {
        const { status, search } = req.query;
        const categories = await categoryService.getCategories(search, status);
        
        res.render('admin/category-managment', { 
            categories, 
            selectedStatus: status || "all", 
            search 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
};

const loadaddCategory = async (req, res) => {
    res.render('admin/add-category', { message: "" });
};

const addCategory = async (req, res) => {
    try {
        const { name } = req.body;
        await categoryService.createCategory(name);
        res.redirect('/admin/categories');
    } catch (err) {
        res.render('admin/add-category', { message: err.message });
    }
};

const loadeditCategory = async (req, res) => {
    try {
        const category = await categoryService.getCategoryById(req.params.id);
        res.render('admin/edit-category', { category, message: "" });
    } catch (err) {
        res.redirect('/admin/categories');
    }
};

const editCategory = async (req, res) => {
    try {
        const { name } = req.body;
        const { id } = req.params;
        await categoryService.updateCategory(id, name);
        res.redirect('/admin/categories');
    } catch (err) {
        const category = await categoryService.getCategoryById(req.params.id);
        res.render('admin/edit-category', { category, message: err.message });
    }
};

const blockCategory = async (req, res) => {
    try {
        const updatedCategory = await categoryService.updateCategoryStatus(req.params.id, "blocked");
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({ success: true, status: "blocked" });
        }

        res.redirect('/admin/categories');
    } catch (err) {
        console.error(err);
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(500).json({ success: false, message: "Error blocking category" });
        }
        res.redirect('/admin/categories');
    }
};

const unblockCategory = async (req, res) => {
    try {
        const updatedCategory = await categoryService.updateCategoryStatus(req.params.id, "active");

        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({ success: true, status: "active" });
        }

        res.redirect('/admin/categories');
    } catch (err) {
        console.error(err);
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(500).json({ success: false, message: "Error unblocking category" });
        }
        res.redirect('/admin/categories');
    }
};

const categoryController = {
    loadCategory, loadaddCategory, addCategory,
    loadeditCategory, editCategory, blockCategory,
    unblockCategory
};

export default categoryController;
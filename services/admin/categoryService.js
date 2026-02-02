import Category from "../../model/category.js";

export const getCategories = async (search, status) => {
    let filter = {};
    if (search) {
        filter.name = { $regex: search, $options: "i" };
    }
    if (status && status !== "all") {
        filter.status = status;
    }
    return await Category.find(filter).sort({ createdAt: -1 }).lean();
};

export const createCategory = async (name) => {
    const trimmedName = name.trim();
    
    const totalActive = await Category.countDocuments({ status: "active" });
    if (totalActive >= 10) {
        throw new Error("Maximum limit of 10 active categories reached.");
    }

    if (!trimmedName) {
        throw new Error("Please enter a valid category name.");
    }

    const exist = await Category.findOne({ name: { $regex: `^${trimmedName}$`, $options: "i" } });
    if (exist) {
        throw new Error("Category already exists.");
    }

    return await Category.create({ name: trimmedName });
};

export const getCategoryById = async (id) => {
    return await Category.findById(id);
};

export const updateCategory = async (id, newName) => {
    const trimmedName = newName.trim();
    const currentCategory = await Category.findById(id);

    if (currentCategory.name === trimmedName) {
        throw new Error("Category name is the same as the current one.");
    }

    const exist = await Category.findOne({ _id: { $ne: id }, name: trimmedName });
    if (exist) {
        throw new Error("Another category with this name already exists.");
    }

    return await Category.findByIdAndUpdate(id, { name: trimmedName });
};

export const updateCategoryStatus = async (id, status) => {
    return await Category.findByIdAndUpdate(id, { status });
};
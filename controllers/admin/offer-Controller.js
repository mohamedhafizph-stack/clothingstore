import * as offerService from "../../services/admin/offerService.js"
import Product from "../../model/Product.js"
import Category from "../../model/category.js"
import Offer from "../../model/Offer.js"
import mongoose from "mongoose"; 


export const editOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedOffer = await offerService.updateOffer(id, req.body);
        
        res.json({ 
            success: true, 
            message: "Offer updated and prices synchronized!", 
            data: updatedOffer 
        });
    } catch (error) {
        console.error("Edit Offer Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};


export const addOffer = async (req, res) => {
    try {
        const newOffer = await offerService.createOffer(req.body);
        res.status(200).json({ success: true, message: 'Offer activated!', data: newOffer });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteOffer = async (req, res) => {
    try {
        await offerService.removeOffer(req.params.id);
        res.json({ success: true, message: "Offer deleted and prices recalculated!" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const loadOfferPage = async (req, res) => {
    try {
        let result = await offerService.loadOfferPage(req.query);
        
        res.render('admin/offer-managment', {
            offers: result.offers,
            products: result.products,
            categories: result.categories,
            currentPage: result.currentPage,
            totalPages: result.totalPages,
            search: result.search,
            type: result.type,
            activePage: "offers",
            status:result.status
        });
    } catch (error) {
        console.error("Error loading Offer Page:", error);
        res.status(500).send("Internal Server Error");
    }
};

const offerController = {loadOfferPage,addOffer,editOffer,deleteOffer}
export default offerController;
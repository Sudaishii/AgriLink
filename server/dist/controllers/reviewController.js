"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewController = void 0;
const reviewService_1 = require("../services/reviewService");
exports.reviewController = {
    getReviews: async (req, res) => {
        try {
            const productId = parseInt(req.params.productId);
            const reviews = await reviewService_1.reviewService.getReviewsByProductId(productId);
            const stats = await reviewService_1.reviewService.getAverageRating(productId);
            res.json({ reviews, stats });
        }
        catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
    addReview: async (req, res) => {
        try {
            const userId = req.user.id;
            const { productId, rating, comment } = req.body;
            await reviewService_1.reviewService.addReview(userId, productId, rating, comment);
            res.status(201).json({ message: 'Review added' });
        }
        catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: 'You have already reviewed this product' });
            }
            res.status(500).json({ message: error.message });
        }
    },
    getFarmerServiceReviews: async (req, res) => {
        try {
            const farmerId = parseInt(req.params.farmerId);
            if (!Number.isFinite(farmerId) || farmerId <= 0) {
                return res.status(400).json({ message: 'Invalid farmer id' });
            }
            const reviews = await reviewService_1.reviewService.getFarmerServiceReviewsByFarmerId(farmerId);
            const stats = await reviewService_1.reviewService.getFarmerServiceRatingStats(farmerId);
            res.json({ reviews, stats });
        }
        catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
    addFarmerServiceReview: async (req, res) => {
        try {
            const userId = req.user.id;
            const reqId = Number(req.body?.reqId);
            const rating = Number(req.body?.rating);
            const comment = String(req.body?.comment || '').trim();
            if (!Number.isFinite(reqId) || reqId <= 0) {
                return res.status(400).json({ message: 'Invalid order id.' });
            }
            if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
                return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
            }
            if (!comment) {
                return res.status(400).json({ message: 'Comment is required.' });
            }
            await reviewService_1.reviewService.addFarmerServiceReview(userId, reqId, rating, comment);
            return res.status(201).json({ message: 'Farmer service review added' });
        }
        catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: 'You have already reviewed this completed order.' });
            }
            if (String(error?.message || '').includes('not eligible')) {
                return res.status(400).json({ message: error.message });
            }
            return res.status(500).json({ message: error.message });
        }
    }
};

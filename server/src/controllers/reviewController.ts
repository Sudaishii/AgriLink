import { Request, Response } from 'express';
import { reviewService } from '../services/reviewService';

export const reviewController = {
    getReviews: async (req: Request, res: Response) => {
        try {
            const productId = parseInt(req.params.productId as string);
            const reviews = await reviewService.getReviewsByProductId(productId);
            const stats = await reviewService.getAverageRating(productId);
            res.json({ reviews, stats });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    },

    addReview: async (req: any, res: Response) => {
        try {
            const userId = req.user.id;
            const { productId, rating, comment } = req.body;
            await reviewService.addReview(userId, productId, rating, comment);
            res.status(201).json({ message: 'Review added' });
        } catch (error: any) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: 'You have already reviewed this product' });
            }
            res.status(500).json({ message: error.message });
        }
    },

    getFarmerServiceReviews: async (req: Request, res: Response) => {
        try {
            const farmerId = parseInt(req.params.farmerId as string);
            if (!Number.isFinite(farmerId) || farmerId <= 0) {
                return res.status(400).json({ message: 'Invalid farmer id' });
            }

            const reviews = await reviewService.getFarmerServiceReviewsByFarmerId(farmerId);
            const stats = await reviewService.getFarmerServiceRatingStats(farmerId);
            res.json({ reviews, stats });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    },

    addFarmerServiceReview: async (req: any, res: Response) => {
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

            await reviewService.addFarmerServiceReview(userId, reqId, rating, comment);
            return res.status(201).json({ message: 'Farmer service review added' });
        } catch (error: any) {
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

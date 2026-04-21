import { Request, Response } from 'express';
import * as phenotypingService from '../services/phenotypingService';

export const getFarmerPhenotypingResults = async (req: Request, res: Response) => {
    try {
        const u_id = parseInt(req.params.u_id as string);
        const results = await phenotypingService.getPhenotypingResultsByFarmer(u_id);
        res.json({ results });
    } catch (error: any) {
        res.status(500).json({ message: 'Error retrieving analysis.', error: error.message });
    }
};

export const getProductPhenotypingResult = async (req: Request, res: Response) => {
    try {
        const p_id = parseInt(req.params.p_id as string);
        const result = await phenotypingService.getPhenotypingResultByProduct(p_id);
        res.json({ result });
    } catch (error: any) {
        res.status(500).json({ message: 'Error retrieving scan.', error: error.message });
    }
};

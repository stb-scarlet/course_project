import { Request, Response, NextFunction } from 'express';
export declare function listPositions(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getPosition(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function createPosition(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function updatePosition(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
export declare function duplicatePosition(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function deletePosition(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function checkAccess(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
export declare function getPositionCVs(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=position.controller.d.ts.map
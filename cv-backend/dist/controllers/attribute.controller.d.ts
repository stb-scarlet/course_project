import { Request, Response, NextFunction } from 'express';
export declare function listAttributes(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function recentAttributes(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
export declare function getAttribute(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function createAttribute(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function updateAttribute(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function deleteAttribute(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=attribute.controller.d.ts.map
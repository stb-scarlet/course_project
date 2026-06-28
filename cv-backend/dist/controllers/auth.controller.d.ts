import { Request, Response, NextFunction } from 'express';
export declare function register(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function login(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getMe(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function updatePreferences(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function oauthCallback(req: Request, res: Response): void;
//# sourceMappingURL=auth.controller.d.ts.map
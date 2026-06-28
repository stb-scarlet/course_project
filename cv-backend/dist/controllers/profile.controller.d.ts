import { Request, Response, NextFunction } from 'express';
export declare function getProfile(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
export declare function updateProfile(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
export declare function upsertAttributeValue(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
export declare function removeAttributeFromProfile(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function createProject(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function updateProject(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
export declare function deleteProject(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function autocompleteTags(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=profile.controller.d.ts.map
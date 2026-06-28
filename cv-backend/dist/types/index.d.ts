import { Role } from "@prisma/client";
export interface JwtPayload {
    userId: string;
    role: Role;
    iat?: number;
    exp?: number;
}
export interface AuthRequest extends Express.Request {
    user?: {
        id: string;
        role: Role;
        email: string;
    };
}
declare global {
    namespace Express {
        interface Request {
            user?: User;
        }
        interface User {
            id: string;
            email: string;
            role: Role;
        }
    }
}
//# sourceMappingURL=index.d.ts.map
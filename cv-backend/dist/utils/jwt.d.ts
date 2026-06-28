import { Role } from '@prisma/client';
import { JwtPayload } from '../types';
export declare function signToken(userId: string, role: Role): string;
export declare function verifyToken(token: string): JwtPayload;
//# sourceMappingURL=jwt.d.ts.map
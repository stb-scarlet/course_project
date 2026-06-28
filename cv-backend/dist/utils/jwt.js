"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signToken = signToken;
exports.verifyToken = verifyToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function signToken(userId, role) {
    return jsonwebtoken_1.default.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') });
}
function verifyToken(token) {
    return jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
}
//# sourceMappingURL=jwt.js.map
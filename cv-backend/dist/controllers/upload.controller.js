"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
exports.uploadImage = uploadImage;
const multer_1 = __importDefault(require("multer"));
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
const error_middleware_1 = require("../middlewares/error.middleware");
// Use memory storage — we upload directly to Cloudinary, never to disk/DB
const storage = multer_1.default.memoryStorage();
exports.upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            cb(new error_middleware_1.AppError(400, 'Only image files allowed'));
        }
        else {
            cb(null, true);
        }
    },
});
// POST /api/upload/image
async function uploadImage(req, res, next) {
    try {
        if (!req.file)
            throw new error_middleware_1.AppError(400, 'No file provided');
        const result = await new Promise((resolve, reject) => {
            const stream = cloudinary_1.default.uploader.upload_stream({ folder: 'cv-management', resource_type: 'image' }, (error, result) => {
                if (error || !result)
                    return reject(error);
                resolve(result);
            });
            stream.end(req.file.buffer);
        });
        res.json({ url: result.secure_url, publicId: result.public_id });
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=upload.controller.js.map
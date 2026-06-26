import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary';
import { AppError } from '../middlewares/error.middleware';

// Use memory storage — we upload directly to Cloudinary, never to disk/DB
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new AppError(400, 'Only image files allowed') as any);
    } else {
      cb(null, true);
    }
  },
});

// POST /api/upload/image
export async function uploadImage(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw new AppError(400, 'No file provided');

    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'cv-management', resource_type: 'image' },
        (error, result) => {
          if (error || !result) return reject(error);
          resolve(result as any);
        }
      );
      stream.end(req.file!.buffer);
    });

    res.json({ url: result.secure_url, publicId: result.public_id });
  } catch (err) {
    next(err);
  }
}

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import multer from 'multer';
import { HttpError } from '../../middleware/http-error';
import { createAuthenticate, requireStudent } from '../auth/auth.middleware';
import { createDefaultAuthDependencies, type AuthDependencies } from '../auth/auth.dependencies';
import { env } from '../../config/env';

export const UPLOADS_DIR = env.UPLOADS_DIRECTORY
  ? path.resolve(env.UPLOADS_DIRECTORY)
  : path.resolve(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// Rate limiting: max 30 uploads per user per 60 seconds
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_UPLOADS = 30;
const userUploadHistory = new Map<string, number[]>();

function checkAndRecordRateLimit(userId: string, count: number): boolean {
  const now = Date.now();
  const history = userUploadHistory.get(userId) ?? [];
  const recent = history.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);

  if (recent.length + count > RATE_LIMIT_MAX_UPLOADS) {
    userUploadHistory.set(userId, recent);
    return false;
  }

  for (let i = 0; i < count; i++) {
    recent.push(now);
  }
  userUploadHistory.set(userId, recent);
  return true;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
    const uniqueName = `${crypto.randomUUID()}${safeExt}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
    cb(new HttpError(400, 'INVALID_FILE_TYPE', 'Only JPEG, PNG, and WebP images are allowed.'));
    return;
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10,
  },
  fileFilter,
});

async function cleanupUploadedFiles(files: Express.Multer.File[]): Promise<void> {
  for (const file of files) {
    if (file?.path) {
      try {
        await fs.promises.unlink(file.path);
      } catch {
        // file already deleted or does not exist
      }
    }
  }
}

/**
 * Validates the file magic numbers to ensure genuine JPEG, PNG, or WebP content.
 */
async function verifyMagicBytes(filePath: string): Promise<boolean> {
  let handle: fs.promises.FileHandle | null = null;
  try {
    handle = await fs.promises.open(filePath, 'r');
    const buffer = Buffer.alloc(12);
    const { bytesRead } = await handle.read(buffer, 0, 12, 0);
    if (bytesRead < 4) return false;

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return true;
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      bytesRead >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return true;
    }

    // WebP: RIFF (bytes 0..3) ... WEBP (bytes 8..11)
    if (
      bytesRead >= 12 &&
      buffer[0] === 0x52 && // 'R'
      buffer[1] === 0x49 && // 'I'
      buffer[2] === 0x46 && // 'F'
      buffer[3] === 0x46 && // 'F'
      buffer[8] === 0x57 && // 'W'
      buffer[9] === 0x45 && // 'E'
      buffer[10] === 0x42 && // 'B'
      buffer[11] === 0x50 // 'P'
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  } finally {
    if (handle) {
      await handle.close();
    }
  }
}

export function createUploadRouter(
  authDependencies: AuthDependencies = createDefaultAuthDependencies(),
): Router {
  const router = Router();
  const authenticate = createAuthenticate(authDependencies);
  const student = [authenticate, requireStudent] as const;

  router.post(
    '/',
    ...student,
    (req, res, next) => {
      upload.fields([
        { name: 'file', maxCount: 1 },
        { name: 'files', maxCount: 10 },
      ])(req, res, async (err: unknown) => {
        if (err) {
          const filesMap = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
          const allFiles = [...(filesMap?.file ?? []), ...(filesMap?.files ?? [])];
          await cleanupUploadedFiles(allFiles);

          if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
              return next(
                new HttpError(400, 'FILE_TOO_LARGE', 'Each image must be 5MB or smaller.'),
              );
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
              return next(
                new HttpError(400, 'TOO_MANY_FILES', 'You can upload up to 10 photos per request.'),
              );
            }
            return next(new HttpError(400, 'UPLOAD_ERROR', err.message));
          }
          return next(err);
        }
        next();
      });
    },
    async (req, res, next) => {
      const filesMap = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const uploadedFiles: Express.Multer.File[] = [];

      if (filesMap?.file) {
        uploadedFiles.push(...filesMap.file);
      }
      if (filesMap?.files) {
        uploadedFiles.push(...filesMap.files);
      }

      if (uploadedFiles.length === 0) {
        return next(new HttpError(400, 'NO_FILE_UPLOADED', 'Please select at least one image file.'));
      }

      // Check upload rate limit
      const userId = req.authUser!.id;
      if (!checkAndRecordRateLimit(userId, uploadedFiles.length)) {
        await cleanupUploadedFiles(uploadedFiles);
        return next(
          new HttpError(429, 'RATE_LIMIT_EXCEEDED', 'Too many photo uploads. Please wait a minute before uploading more.'),
        );
      }

      // Validate magic bytes for every uploaded file
      for (const file of uploadedFiles) {
        const isValidSignature = await verifyMagicBytes(file.path);
        if (!isValidSignature) {
          await cleanupUploadedFiles(uploadedFiles);
          return next(
            new HttpError(
              400,
              'INVALID_FILE_SIGNATURE',
              `The uploaded file "${file.originalname}" content does not match a valid JPEG, PNG, or WebP image.`,
            ),
          );
        }
      }

      const results = uploadedFiles.map((file) => ({
        url: `/uploads/${file.filename}`,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      }));

      res.status(201).json({
        url: results[0].url,
        items: results,
      });
    },
  );

  return router;
}

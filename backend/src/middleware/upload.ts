import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import { ApiError } from '../utils/ApiError';

const storage = multer.memoryStorage();

const DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const IMAGE_TYPES = ['image/png', 'image/jpeg'];

// First gate only: the client-declared type is trivially spoofable, so the
// controllers re-check the real file signature (see utils/fileSignature.ts).
// Rejections are explicit errors rather than silently dropped files — a
// silently dropped upload would let a submission "succeed" without its file
// (that is exactly how the optional cover image used to get lost).
function filterFor(rules: Record<string, { types: string[]; message: string }>) {
  return (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const rule = rules[file.fieldname];
    if (!rule) return cb(ApiError.badRequest(`Unexpected file field: ${file.fieldname}`));
    if (!rule.types.includes(file.mimetype)) return cb(ApiError.badRequest(rule.message));
    cb(null, true);
  };
}

export const uploadManuscript = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024, files: 2 }, // 25MB each
  fileFilter: filterFor({
    manuscript: { types: DOCUMENT_TYPES, message: 'Manuscript must be a PDF or Word document (.pdf, .doc, .docx)' },
    cover: { types: IMAGE_TYPES, message: 'Cover must be a PNG or JPEG image' },
  }),
}).fields([
  { name: 'manuscript', maxCount: 1 },
  { name: 'cover', maxCount: 1 },
]);

export const uploadImage = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 1 }, // 8MB
  fileFilter: filterFor({ image: { types: IMAGE_TYPES, message: 'Image must be a PNG or JPEG' } }),
}).single('image');

import { Request, Response } from 'express';
import { Manuscript } from '../models/Manuscript';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { isAllowedManuscriptFile, isAllowedImageFile } from '../utils/fileSignature';
import { uploadPrivateFile, getSignedFileUrl } from '../services/storageService';
import { uploadImageBuffer } from '../services/cloudinaryService';

type UploadedFiles = { [field: string]: Express.Multer.File[] };

export const submitManuscript = asyncHandler(async (req: Request, res: Response) => {
  const files = req.files as UploadedFiles | undefined;
  const manuscriptFile = files?.manuscript?.[0];
  const coverFile = files?.cover?.[0];

  if (!manuscriptFile) {
    throw ApiError.badRequest('A manuscript file (PDF or Word document) is required');
  }
  if (!isAllowedManuscriptFile(manuscriptFile.buffer)) {
    throw ApiError.badRequest('Manuscript must be a genuine PDF or Word document');
  }
  if (coverFile && !isAllowedImageFile(coverFile.buffer)) {
    throw ApiError.badRequest('Cover file must be a genuine PNG or JPEG image');
  }

  const { key: manuscriptFileKey, url: manuscriptFileUrl } = await uploadPrivateFile(
    manuscriptFile.buffer,
    manuscriptFile.originalname,
    manuscriptFile.mimetype,
    'manuscripts'
  );

  let coverFileUrl: string | undefined;
  let coverFileKey: string | undefined;
  if (coverFile) {
    const uploaded = await uploadPrivateFile(
      coverFile.buffer,
      coverFile.originalname,
      coverFile.mimetype,
      'manuscript-covers'
    );
    coverFileUrl = uploaded.url;
    coverFileKey = uploaded.key;
  }

  const manuscript = await Manuscript.create({
    ...req.body,
    manuscriptFileUrl,
    manuscriptFileKey,
    coverFileUrl,
    coverFileKey,
  });

  res.status(201).json({
    success: true,
    message: "Thanks — your manuscript has been received. We'll be in touch by email.",
    data: { id: manuscript.id, status: manuscript.status },
  });
});

export const getManuscripts = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const status = req.query.status as string | undefined;

  const filter = status ? { status } : {};
  const skip = (page - 1) * limit;

  const [manuscripts, total] = await Promise.all([
    Manuscript.find(filter)
      .select('-manuscriptFileKey -coverFileKey')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Manuscript.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: manuscripts,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

export const getManuscriptById = asyncHandler(async (req: Request, res: Response) => {
  const manuscript = await Manuscript.findById(req.params.id).select(
    '-manuscriptFileKey -coverFileKey'
  );
  if (!manuscript) throw ApiError.notFound('Manuscript not found');
  res.json({ success: true, data: manuscript });
});

export const updateManuscriptStatus = asyncHandler(async (req: Request, res: Response) => {
  const manuscript = await Manuscript.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true }
  ).select('-manuscriptFileKey -coverFileKey');
  if (!manuscript) throw ApiError.notFound('Manuscript not found');
  res.json({ success: true, data: manuscript });
});

export const getManuscriptFileUrl = asyncHandler(async (req: Request, res: Response) => {
  const manuscript = await Manuscript.findById(req.params.id);
  if (!manuscript) throw ApiError.notFound('Manuscript not found');

  const field = req.query.file === 'cover' ? manuscript.coverFileKey : manuscript.manuscriptFileKey;
  if (!field) throw ApiError.notFound('File not found for this manuscript');

  const url = await getSignedFileUrl(field, 300);
  res.json({ success: true, url, expiresInSeconds: 300 });
});

// Used by the admin "upload cover image" control on book/author forms.
export const uploadCoverImage = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file as Express.Multer.File | undefined;
  if (!file) throw ApiError.badRequest('No image provided');
  if (!isAllowedImageFile(file.buffer)) {
    throw ApiError.badRequest('File must be a genuine PNG or JPEG image');
  }
  const url = await uploadImageBuffer(file.buffer, 'covers');
  res.json({ success: true, url });
});

import { Request, Response } from 'express';
import { ContactMessage } from '../models/ContactMessage';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

export const submitContactMessage = asyncHandler(async (req: Request, res: Response) => {
  await ContactMessage.create(req.body);
  res.status(201).json({ success: true, message: "Thanks for reaching out — we'll reply soon." });
});

export const getContactMessages = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const unreadOnly = req.query.unread === 'true';

  const filter = unreadOnly ? { read: false } : {};
  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    ContactMessage.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ContactMessage.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: messages,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

export const markMessageRead = asyncHandler(async (req: Request, res: Response) => {
  const message = await ContactMessage.findByIdAndUpdate(
    req.params.id,
    { read: true },
    { new: true }
  );
  if (!message) throw ApiError.notFound('Message not found');
  res.json({ success: true, data: message });
});

export const deleteContactMessage = asyncHandler(async (req: Request, res: Response) => {
  const message = await ContactMessage.findByIdAndDelete(req.params.id);
  if (!message) throw ApiError.notFound('Message not found');
  res.json({ success: true, message: 'Message deleted' });
});

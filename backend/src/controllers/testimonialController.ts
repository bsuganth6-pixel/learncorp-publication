import { Request, Response } from 'express';
import { Testimonial } from '../models/Testimonial';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { audit } from '../services/auditService';

export const getPublishedTestimonials = asyncHandler(async (_req: Request, res: Response) => {
  const testimonials = await Testimonial.find({ status: 'published' }).sort({ createdAt: -1 });
  res.json({ success: true, data: testimonials });
});

export const getAllTestimonials = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const skip = (page - 1) * limit;

  const [testimonials, total] = await Promise.all([
    Testimonial.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    Testimonial.countDocuments(),
  ]);

  res.json({
    success: true,
    data: testimonials,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

export const createTestimonial = asyncHandler(async (req: Request, res: Response) => {
  const testimonial = await Testimonial.create(req.body);
  await audit(req, { action: 'testimonial.created', targetType: 'testimonial', targetId: testimonial.id, summary: `Added testimonial from ${testimonial.name}` });
  res.status(201).json({ success: true, data: testimonial });
});

export const updateTestimonial = asyncHandler(async (req: Request, res: Response) => {
  const testimonial = await Testimonial.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!testimonial) throw ApiError.notFound('Testimonial not found');
  await audit(req, { action: 'testimonial.updated', targetType: 'testimonial', targetId: testimonial.id, summary: `Updated testimonial from ${testimonial.name} (${testimonial.status})` });
  res.json({ success: true, data: testimonial });
});

export const deleteTestimonial = asyncHandler(async (req: Request, res: Response) => {
  const testimonial = await Testimonial.findByIdAndDelete(req.params.id);
  if (!testimonial) throw ApiError.notFound('Testimonial not found');
  await audit(req, { action: 'testimonial.deleted', targetType: 'testimonial', targetId: testimonial.id, summary: `Deleted testimonial from ${testimonial.name}` });
  res.json({ success: true, message: 'Testimonial deleted' });
});

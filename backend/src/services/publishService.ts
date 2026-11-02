import type { IUser } from '../models/User';
import { Manuscript, IManuscript } from '../models/Manuscript';
import { Book, IBook } from '../models/Book';
import { Author, IAuthor } from '../models/Author';
import { ApiError } from '../utils/ApiError';
import { isAllowedImageFile } from '../utils/fileSignature';
import { uniqueAuthorSlug, uniqueBookSlug } from './slugService';
import { readPrivateFile } from './storageService';
import { uploadImageBuffer } from './cloudinaryService';

export interface PublishInput {
  isbn: string;
  price: number;
  publicationDate?: Date;
  /** Public cover URL (uploaded through the admin image control). Falls back to the author's own cover. */
  coverImageUrl?: string;
  keywords?: string[];
}

/** The catalogue needs a public cover. The author's private upload is copied to the image CDN, never exposed in place. */
async function resolveCoverUrl(manuscript: IManuscript, provided?: string): Promise<string> {
  if (provided) return provided;
  if (manuscript.coverFileKey) {
    const bytes = await readPrivateFile(manuscript.coverFileKey);
    if (!isAllowedImageFile(bytes)) {
      throw ApiError.badRequest('The cover the author uploaded is not a valid image. Upload a cover image to publish.');
    }
    return uploadImageBuffer(bytes, 'covers');
  }
  throw ApiError.badRequest('A cover image is required to publish. Upload one and try again.');
}

/** One public profile per author account, created the first time they are published. */
async function ensureAuthorProfile(manuscript: IManuscript): Promise<IAuthor> {
  if (manuscript.author) {
    const existing = await Author.findOne({ user: manuscript.author });
    if (existing) return existing;
  }
  return Author.create({
    user: manuscript.author,
    name: manuscript.authorName,
    slug: await uniqueAuthorSlug(manuscript.authorName),
    bio: manuscript.authorBio,
  });
}

/**
 * Turns an accepted manuscript into a live catalogue book and marks it Published.
 * Safe to retry: if a previous attempt created the book but failed before updating the manuscript,
 * the existing book is reused instead of creating a duplicate.
 */
export async function publishManuscript(
  manuscript: IManuscript,
  input: PublishInput,
  admin: Pick<IUser, '_id'>
): Promise<{ book: IBook; manuscript: IManuscript }> {
  if (manuscript.status !== 'Accepted') {
    throw ApiError.conflict(`Only accepted manuscripts can be published (this one is “${manuscript.status}”).`);
  }

  let book = manuscript.book ? await Book.findById(manuscript.book) : null;
  if (!book) {
    const author = await ensureAuthorProfile(manuscript);
    const coverImageUrl = await resolveCoverUrl(manuscript, input.coverImageUrl);
    book = await Book.create({
      title: manuscript.bookTitle,
      slug: await uniqueBookSlug(manuscript.bookTitle),
      authors: [author._id],
      description: manuscript.description,
      isbn: input.isbn,
      category: manuscript.category,
      language: manuscript.language,
      publicationDate: input.publicationDate ?? new Date(),
      pages: manuscript.pageCount,
      format: manuscript.format,
      price: input.price,
      coverImageUrl,
      keywords: input.keywords ?? [],
      status: 'published',
    });
  }

  // Compare-and-set on the status, so two admins can't both publish the same manuscript.
  const updated = await Manuscript.findOneAndUpdate(
    { _id: manuscript._id, status: 'Accepted' },
    {
      $set: { status: 'Published', book: book._id },
      $push: { history: { status: 'Published', actor: 'admin', by: admin._id, at: new Date() } },
    },
    { new: true }
  );
  if (!updated) throw ApiError.conflict('This manuscript changed while publishing. Reload it and check its status.');
  return { book, manuscript: updated };
}

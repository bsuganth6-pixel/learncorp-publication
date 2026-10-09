import type {
  Author, Book, ContactMessage, Manuscript, Paginated, Testimonial, AdminUser,
} from './types';

// Browser: same-origin /api (proxied to the API by next.config.js, so the
// session cookie is first-party). Server (SSR/ISR/sitemap): call the API directly.
const API_URL =
  typeof window === 'undefined'
    ? `${(process.env.API_ORIGIN || 'http://localhost:5000').replace(/\/$/, '')}/api`
    : '/api';

export class ApiClientError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

interface FetchOptions extends RequestInit {
  revalidate?: number | false;
  /** Abort the request after this many ms (default 10s; uploads pass more). */
  timeoutMs?: number;
}

// Low-level request used by every helper below. Always sends cookies, since
// admin calls rely on the httpOnly session cookie rather than a bearer token.
async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { revalidate, timeoutMs = 10_000, ...init } = options;

  // AbortController + setTimeout rather than AbortSignal.timeout(): the latter
  // is missing on older Safari, which would break every request there.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      credentials: 'include',
      headers: {
        ...(init.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
      ...(revalidate !== undefined ? { next: { revalidate: revalidate as number | false } } : {}),
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new ApiClientError(408, 'The server took too long to respond. Please try again.');
    }
    throw new ApiClientError(0, 'Could not reach the server. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // no JSON body (e.g. 204)
  }

  if (!res.ok) {
    const message =
      body && typeof body === 'object' && 'message' in body
        ? String((body as { message: unknown }).message)
        : `Request failed with status ${res.status}`;
    throw new ApiClientError(res.status, message, (body as { details?: unknown })?.details);
  }

  return body as T;
}

// ---- Public reads used by Server Components (SSG/ISR) ----
// A genuine 404 from the API is an expected answer, not a failure. Anything
// else is handled differently at build time vs. run time:
//  - build: an unreachable/cold API (e.g. a sleeping free-tier host) must not fail
//    the deploy, so degrade to the fallback; ISR fills the pages in afterwards.
//  - runtime: rethrow. Next.js ISR then keeps serving the last good page instead of
//    caching an empty list / false 404 for the revalidate window, and a cold page
//    shows the error boundary rather than lying about the content.
async function safe<T>(
  fn: () => Promise<T>,
  fallback: T,
  label: string,
  opts: { missingIsFallback?: boolean } = {}
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (opts.missingIsFallback && err instanceof ApiClientError && err.status === 404) return fallback;
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      console.warn(`[api] ${label} failed during build, using fallback:`, (err as Error).message);
      return fallback;
    }
    throw err;
  }
}

export interface BookQuery {
  page?: number; limit?: number; category?: string; author?: string; format?: string;
  language?: string; minPrice?: number; maxPrice?: number; year?: number;
  search?: string; sort?: string;
}

function toQueryString(params: object): string {
  const usp = new URLSearchParams();
  (Object.entries(params) as [string, unknown][]).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') usp.set(key, String(value));
  });
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

export const getBooks = (query: BookQuery = {}, revalidate = 120) =>
  safe(
    () => apiFetch<Paginated<Book>>(`/books${toQueryString(query)}`, { revalidate }),
    { data: [], pagination: { page: 1, limit: 12, total: 0, pages: 0 } },
    'getBooks'
  );

export const getBookBySlug = (slug: string, revalidate = 120) =>
  safe(
    () => apiFetch<{ data: Book; related: Book[] }>(`/books/${slug}`, { revalidate }),
    null as { data: Book; related: Book[] } | null,
    'getBookBySlug',
    { missingIsFallback: true }
  );

export const getAuthors = (query: { page?: number; limit?: number; search?: string } = {}, revalidate = 300) =>
  safe(
    () => apiFetch<Paginated<Author>>(`/authors${toQueryString(query)}`, { revalidate }),
    { data: [], pagination: { page: 1, limit: 12, total: 0, pages: 0 } },
    'getAuthors'
  );

export const getAuthorBySlug = (slug: string, revalidate = 300) =>
  safe(
    () => apiFetch<{ data: Author; books: Book[] }>(`/authors/${slug}`, { revalidate }),
    null as { data: Author; books: Book[] } | null,
    'getAuthorBySlug',
    { missingIsFallback: true }
  );

export const getPublicStats = (revalidate = 300) =>
  safe(
    () => apiFetch<{ data: { publishedBooks: number; authors: number; categories: number } }>(`/stats`, { revalidate }),
    null as { data: { publishedBooks: number; authors: number; categories: number } } | null,
    'getPublicStats'
  );

export const getTestimonials = (revalidate = 300) =>
  safe(() => apiFetch<{ data: Testimonial[] }>(`/testimonials`, { revalidate }), { data: [] }, 'getTestimonials');

// ---- Auth (client-side, cookie based) ----
export const login = (email: string, password: string) =>
  apiFetch<{ data: AdminUser }>(`/auth/login`, { method: 'POST', body: JSON.stringify({ email, password }) });

export const logout = () => apiFetch<{ success: boolean }>(`/auth/logout`, { method: 'POST' });

export const getMe = () => apiFetch<{ data: AdminUser }>(`/auth/me`, { cache: 'no-store' });

// ---- Public writes ----
export const submitContactMessage = (payload: {
  name: string; email: string; phone?: string; subject: string; message: string;
}) => apiFetch<{ success: boolean; message: string }>(`/contact`, { method: 'POST', body: JSON.stringify(payload) });

export const submitManuscript = (formData: FormData) =>
  apiFetch<{ success: boolean; message: string; data: { id: string; status: string } }>(`/manuscripts`, {
    method: 'POST',
    body: formData,
    timeoutMs: 120_000,
  });

// ---- Admin reads (client-side, called from dashboard components) ----
export const getAdminBooks = (query: BookQuery & { status?: string } = {}) =>
  apiFetch<Paginated<Book>>(`/books/admin/all${toQueryString(query)}`, { cache: 'no-store' });

export const getAdminBookById = (id: string) =>
  apiFetch<{ data: Book }>(`/books/admin/${id}`, { cache: 'no-store' });

export const getAdminAuthors = (query: { page?: number; search?: string } = {}) =>
  apiFetch<Paginated<Author>>(`/authors${toQueryString(query)}`, { cache: 'no-store' });

export const getManuscripts = (query: { page?: number; status?: string } = {}) =>
  apiFetch<Paginated<Manuscript>>(`/manuscripts${toQueryString(query)}`, { cache: 'no-store' });

export const getManuscriptById = (id: string) =>
  apiFetch<{ data: Manuscript }>(`/manuscripts/${id}`, { cache: 'no-store' });

export const getManuscriptFileUrl = (id: string, file: 'manuscript' | 'cover' = 'manuscript') =>
  apiFetch<{ url: string }>(`/manuscripts/${id}/file-url?file=${file}`, { cache: 'no-store' });

export const getContactMessages = (query: { page?: number; unread?: boolean } = {}) =>
  apiFetch<Paginated<ContactMessage>>(`/contact${toQueryString(query)}`, { cache: 'no-store' });

export const getAllTestimonials = (query: { page?: number } = {}) =>
  apiFetch<Paginated<Testimonial>>(`/testimonials/admin/all${toQueryString(query)}`, { cache: 'no-store' });

export const getDashboardStats = () =>
  apiFetch<{
    data: {
      totalBooks: number; publishedBooks: number; draftBooks: number; totalAuthors: number;
      manuscripts: Record<string, number>; unreadMessages: number; pendingTestimonials: number;
    };
  }>(`/dashboard/stats`, { cache: 'no-store' });

// ---- Admin writes ----
export const createBook = (payload: Record<string, unknown>) =>
  apiFetch<{ data: Book }>(`/books`, { method: 'POST', body: JSON.stringify(payload) });

export const updateBook = (id: string, payload: Record<string, unknown>) =>
  apiFetch<{ data: Book }>(`/books/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });

export const deleteBook = (id: string) => apiFetch<{ success: boolean }>(`/books/${id}`, { method: 'DELETE' });

export const addBookReview = (id: string, payload: { name: string; rating: number; comment: string }) =>
  apiFetch<{ data: Book }>(`/books/${id}/reviews`, { method: 'POST', body: JSON.stringify(payload) });

export const deleteBookReview = (id: string, reviewIndex: number) =>
  apiFetch<{ data: Book }>(`/books/${id}/reviews/${reviewIndex}`, { method: 'DELETE' });

export const createAuthor = (payload: Record<string, unknown>) =>
  apiFetch<{ data: Author }>(`/authors`, { method: 'POST', body: JSON.stringify(payload) });

export const updateAuthor = (id: string, payload: Record<string, unknown>) =>
  apiFetch<{ data: Author }>(`/authors/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });

export const deleteAuthor = (id: string) => apiFetch<{ success: boolean }>(`/authors/${id}`, { method: 'DELETE' });

export const updateManuscriptStatus = (id: string, status: string) =>
  apiFetch<{ data: Manuscript }>(`/manuscripts/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });

export const markMessageRead = (id: string) =>
  apiFetch<{ data: ContactMessage }>(`/contact/${id}/read`, { method: 'PATCH' });

export const deleteContactMessage = (id: string) =>
  apiFetch<{ success: boolean }>(`/contact/${id}`, { method: 'DELETE' });

export const createTestimonial = (payload: Record<string, unknown>) =>
  apiFetch<{ data: Testimonial }>(`/testimonials`, { method: 'POST', body: JSON.stringify(payload) });

export const updateTestimonial = (id: string, payload: Record<string, unknown>) =>
  apiFetch<{ data: Testimonial }>(`/testimonials/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });

export const deleteTestimonial = (id: string) =>
  apiFetch<{ success: boolean }>(`/testimonials/${id}`, { method: 'DELETE' });

export const uploadImage = (file: File) => {
  const formData = new FormData();
  formData.append('image', file);
  return apiFetch<{ url: string }>(`/manuscripts/uploads/image`, { method: 'POST', body: formData, timeoutMs: 60_000 });
};

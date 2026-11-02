import { Book } from '../models/Book';
import { Author } from '../models/Author';
import { toSlug } from '../utils/slug';

async function firstFreeSlug(base: string, isTaken: (slug: string) => Promise<boolean>): Promise<string> {
  let slug = base;
  let counter = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await isTaken(slug)) {
    slug = `${base}-${counter++}`;
  }
  return slug;
}

const notSelf = (ignoreId?: string) => (ignoreId ? { _id: { $ne: ignoreId } } : {});

export const uniqueBookSlug = (title: string, ignoreId?: string): Promise<string> =>
  firstFreeSlug(toSlug(title), async (slug) => Boolean(await Book.exists({ slug, ...notSelf(ignoreId) })));

export const uniqueAuthorSlug = (name: string, ignoreId?: string): Promise<string> =>
  firstFreeSlug(toSlug(name), async (slug) => Boolean(await Author.exists({ slug, ...notSelf(ignoreId) })));

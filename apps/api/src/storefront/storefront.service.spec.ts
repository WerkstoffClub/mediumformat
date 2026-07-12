import { StorefrontService } from './storefront.service';

/** In-memory Prisma stub covering categoryPage.findUnique + post.findMany. */
function makePrisma(page: any, posts: any[]) {
  return {
    categoryPage: { findUnique: jest.fn(async () => page) },
    post: { findMany: jest.fn(async () => posts) },
  } as any;
}

describe('StorefrontService.categoryPage', () => {
  it('attaches posts for a NEWS_CATEGORY page', async () => {
    const page = {
      slug: 'staff-picks',
      status: 'PUBLISHED',
      kind: 'NEWS_CATEGORY',
      newsCategoryKey: 'STAFF_PICKS',
    };
    const posts = [{ id: 'p1', slug: 'a', status: 'PUBLISHED' }];
    const svc = new StorefrontService(makePrisma(page, posts));

    const result: any = await svc.categoryPage('staff-picks');

    expect(result.posts).toEqual(posts);
  });

  it('does not attach posts for a PRODUCT_PAGE', async () => {
    const page = { slug: 'lps', status: 'PUBLISHED', kind: 'PRODUCT_PAGE', newsCategoryKey: null };
    const svc = new StorefrontService(makePrisma(page, []));

    const result: any = await svc.categoryPage('lps');

    expect(result.posts).toBeUndefined();
  });
});

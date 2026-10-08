import { Testimonial } from '../Testimonial';

describe('Testimonial schema validation', () => {
  it('defaults status to unpublished so nothing goes live unreviewed', () => {
    expect(new Testimonial({ name: 'Jane', message: 'Great experience.' }).status).toBe('unpublished');
  });
  it('rejects an invalid status value', () => {
    expect(new Testimonial({ name: 'Jane', message: 'Great.', status: 'featured' }).validateSync()?.errors.status).toBeDefined();
  });
});

import { describe, it, expect } from 'vitest';
import { cn, formatPrice, initials } from '../utils';

describe('utils', () => {
  it('formatPrice renders INR with Indian digit grouping', () => {
    expect(formatPrice(499)).toBe('₹499');
    expect(formatPrice(125000)).toBe('₹1,25,000');
  });
  it('initials takes at most two uppercase initials', () => {
    expect(initials('jane doe')).toBe('JD');
    expect(initials('Madonna')).toBe('M');
    expect(initials('Ada Augusta King')).toBe('AA');
  });
  it('cn drops falsy values', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b');
  });
});

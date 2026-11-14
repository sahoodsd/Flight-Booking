import { describe, it, expect } from 'vitest';
import { paginationMeta } from './pagination';

describe('paginationMeta', () => {
  it('round the total pages up when total is partial.', () => {
    const result = paginationMeta(1, 10, 25);
    expect(result.totalPages).toBe(3);
  });
});

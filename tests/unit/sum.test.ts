import { describe, expect, it } from 'vitest';
import { sum } from '../../examples/servers/sum.js';

describe('local sum fixture', () => {
  it.each([
    [2, 3, 5],
    [0, 0, 0],
    [-4, 1, -3],
    [0.5, 0.25, 0.75],
  ])('sum(%s, %s) returns value %s', (a, b, value) => {
    expect(sum(a, b)).toEqual({ value });
  });
});

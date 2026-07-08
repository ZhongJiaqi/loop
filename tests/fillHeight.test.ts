import { describe, it, expect } from 'vitest';
import { computeFillHeight, MIN_FILL_HEIGHT } from '../src/lib/fillHeight';

describe('computeFillHeight', () => {
  it('fills from the content top to the nav-clearance bottom', () => {
    // 844 viewport, main starts 106px down, 112px bottom padding reserved for nav.
    expect(computeFillHeight(844, 106, 112)).toBe(626);
  });

  it('accounts for a taller header/banner pushing the content down', () => {
    expect(computeFillHeight(844, 200, 112)).toBe(532);
  });

  it('rounds fractional measurements', () => {
    expect(computeFillHeight(844.6, 106.2, 112)).toBe(626);
  });

  it('never returns less than the minimum usable height', () => {
    expect(computeFillHeight(300, 200, 112)).toBe(MIN_FILL_HEIGHT);
    expect(computeFillHeight(0, 0, 0)).toBe(MIN_FILL_HEIGHT);
  });
});

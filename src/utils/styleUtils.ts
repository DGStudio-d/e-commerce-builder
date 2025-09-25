import type { ComponentStyles, GlobalStyles } from '../types';

export function combineStyles(styles: ComponentStyles = {}, _global: GlobalStyles = {}) {
  // Naive merge for Tailwind class buckets
  return styles;
}

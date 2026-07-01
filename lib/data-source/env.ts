/** Unified mock flag — middleware and queries must share this seam. */
export const IS_MOCK =
  process.env.USE_MOCK === 'true' || process.env.NEXT_PUBLIC_USE_MOCK === 'true';

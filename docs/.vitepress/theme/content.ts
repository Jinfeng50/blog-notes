export const tagSlug = (tag: string) =>
  tag.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '')

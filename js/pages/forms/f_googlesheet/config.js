// config.js — central config for this page

// Optional: "build ping" webhook (fire-and-forget)
export const WEBHOOK_BUILD = 'https://hook.us2.make.com/h10r84lw72sl48qdw07cq8m7ppcsm57v';

// Review submission webhook (Make)
export const REVIEW_WEBHOOK = 'https://hook.us2.make.com/ic641vk7icbq1x4u317qef33ouqakqm5';

// Your product catalog (prefer same-origin if possible)
export const PRODUCTS_JSON_URL = 'https://jmcnealstudentclayton-boop.github.io/dbproject/products/products.json';

// Cache TTL for catalog (ms)
export const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Reviews JSON feed used by the on-page visualization
export const REVIEWS_JSON_URL = 'https://api.jsonbin.io/v3/b/68ded247d0ea881f4093334a';
// If your bin requires X-Master-Key, add it here (or leave null)
export const REVIEWS_JSON_KEY = null; // e.g., 'XXXX'

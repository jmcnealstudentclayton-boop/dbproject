// reviews.js — glue module to keep index.js happy
import { initProductReviews } from './p_reviews.js';
import { initCustomerReviews } from './c_reviews.js';

// Existing API used by index.js
export function initReviews(options = {}) {
  // Product-level table
  initProductReviews(options);
  // Customer-level table
  initCustomerReviews(options);
}

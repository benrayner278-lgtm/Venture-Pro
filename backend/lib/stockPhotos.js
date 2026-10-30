// Finds licensed stock photos from Pixabay for picture slots the owner did not fill with an upload.
// Photos are downloaded once when a page is written, stored as JPEG data URLs, and never hotlinked.
// Without PIXABAY_API_KEY nothing is fetched and the slots stay as neutral blocks.
const STOCK_LIMIT = 8;
const QUERY_PATTERN = /data-stock="([^"]{2,80})"/gi;
// Pixabay's large size is about 1280px wide, which is enough for a page and keeps each photo under about 1 MB.
const STOCK_PHOTO = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]{1,1500000}$/;
const TIMEOUT_MS = 8000;
// Pixabay asks that search requests are cached for 24 hours, so repeat searches reuse the photo found earlier.
const CACHE_MS = 24 * 60 * 60 * 1000;
const CACHE_LIMIT = 500;
const cache = new Map();

const stockQueriesIn = (body) => {
  const queries = new Set();
  for (const [, query] of String(body || '').matchAll(QUERY_PATTERN)) queries.add(query.trim());
  return [...queries];
};

// Keeps only valid photos, keyed by the search words the page used.
const cleanStock = (stock) =>
  Object.fromEntries(
    Object.entries(stock && typeof stock === 'object' ? stock : {})
      .filter(([query, value]) => typeof query === 'string' && query.length >= 2 && query.length <= 80 && STOCK_PHOTO.test(value))
      .slice(0, STOCK_LIMIT),
  );

const searchPixabay = async (query, apiKey) => {
  const url = `https://pixabay.com/api/?${new URLSearchParams({ key: apiKey, q: query, image_type: 'photo', orientation: 'horizontal', safesearch: 'true', per_page: '5' })}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`Pixabay search failed with status ${response.status}`);
  const data = await response.json();
  return data.hits?.[0]?.largeImageURL || null;
};

const downloadPhoto = async (url) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`Pixabay download failed with status ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  return `data:image/jpeg;base64,${bytes.toString('base64')}`;
};

const findStockPhoto = async (query, apiKey) => {
  const url = await searchPixabay(query, apiKey);
  if (!url) return null;
  const photo = await downloadPhoto(url);
  return STOCK_PHOTO.test(photo) ? photo : null;
};

const fetchStockPhoto = async (query, apiKey) => {
  const cached = cache.get(query);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.photo;
  const photo = await findStockPhoto(query, apiKey);
  if (cache.size >= CACHE_LIMIT) cache.clear();
  cache.set(query, { photo, at: Date.now() });
  return photo;
};

// Returns the stock map with photos for every stock slot in the body that does not have one yet.
// A failed search leaves that slot empty rather than failing the whole page.
const fillStockPhotos = async (body, stock) => {
  const current = cleanStock(stock);
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) return current;
  const missing = stockQueriesIn(body).filter((query) => !current[query]).slice(0, STOCK_LIMIT - Object.keys(current).length);
  const results = await Promise.all(
    missing.map(async (query) => {
      try {
        return [query, await fetchStockPhoto(query, apiKey)];
      } catch (error) {
        console.error(`Stock photo for "${query}" failed:`, error.message);
        return [query, null];
      }
    }),
  );
  return cleanStock({ ...current, ...Object.fromEntries(results.filter(([, photo]) => photo)) });
};

module.exports = { cleanStock, fillStockPhotos };

// Photos for shop items and classes. Each photo is a small JPEG stored as a data URL, the same way site photos are stored.
const MAX_PHOTOS = 7;
// Smaller than site photos, because a shop can have many items. The frontend resizes to fit.
const MAX_PHOTO_CHARS = 150000;
const PHOTO_PATTERN = new RegExp(`^data:image/jpeg;base64,[A-Za-z0-9+/=]{1,${MAX_PHOTO_CHARS}}$`);

// Keeps only valid photos, up to MAX_PHOTOS. Anything else is dropped.
const cleanPhotos = (input) => (Array.isArray(input) ? input.filter((photo) => typeof photo === 'string' && PHOTO_PATTERN.test(photo)).slice(0, MAX_PHOTOS) : []);

module.exports = { MAX_PHOTOS, MAX_PHOTO_CHARS, cleanPhotos };

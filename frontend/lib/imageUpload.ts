// Largest photo the site will store, as a base64 string. Keep in step with PHOTO_PATTERN in the backend.
const MAX_PHOTO_CHARS = 400000;
const MAX_SIDE = 1200;

// Resizes a photo to fit in MAX_SIDE pixels and returns it as a JPEG data URL small enough to store.
export const compressPhoto = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Could not process that photo'));
        return;
      }
      // JPEG has no transparency, so paint a white background first.
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img, 0, 0, canvas.width, canvas.height);

      let quality = 0.82;
      let data = canvas.toDataURL('image/jpeg', quality);
      while (data.length > MAX_PHOTO_CHARS && quality > 0.4) {
        quality -= 0.1;
        data = canvas.toDataURL('image/jpeg', quality);
      }
      if (data.length > MAX_PHOTO_CHARS) {
        reject(new Error('That photo is too detailed. Try a smaller version.'));
        return;
      }
      resolve(data);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that file. Use a JPEG, PNG or WebP photo.'));
    };
    img.src = url;
  });

import { v2 as cloudinary } from 'cloudinary';
import env from '../config/env.js';
import { warn } from '../utils/logger.js';

const configured = !!(env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret);

if (configured) {
  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
    secure: true,
  });
} else {
  warn('[storage] Cloudinary not configured — using placeholder URLs. Set CLOUDINARY_* env vars for real uploads.');
}

export const uploadImage = async (buffer, filename, mimetype) => {
  if (!configured) {
    const pseudoUrl = `https://placehold.co/400x250/28a745/white?text=${encodeURIComponent(filename.split('.')[0])}`;
    return { url: pseudoUrl, key: filename };
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'smarted-africa',
        public_id: `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.]/g, '_').replace(/\.[^/.]+$/, '')}`,
        resource_type: 'image',
        transformation: [
          { width: 800, height: 500, crop: 'fill', gravity: 'auto' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, key: result.public_id });
      }
    );
    uploadStream.end(buffer);
  });
};

export const deleteImage = async (key) => {
  if (!configured || !key) return true;
  try {
    await cloudinary.uploader.destroy(key);
    return true;
  } catch (err) {
    warn('[storage] Failed to delete image:', err.message);
    return false;
  }
};

const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Uploads a Buffer to Cloudinary and returns { secureUrl, resourceType, bytes }.
 * `resourceType` lets Cloudinary pick the right pipeline for images/videos vs
 * raw files (PDFs, docs) — Baileys tells us the WhatsApp mediaType, which we
 * map to Cloudinary's expected type.
 */
function mapResourceType(mediaType) {
  if (mediaType === "image" || mediaType === "sticker") return "image";
  if (mediaType === "video") return "video";
  if (mediaType === "audio") return "video"; // Cloudinary treats audio under "video"
  return "raw"; // documents
}

async function uploadBuffer(buffer, { mediaType, folder = "whatsapp-clone", filename } = {}) {
  const resourceType = mapResourceType(mediaType);
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        folder,
        public_id: filename ? filename.replace(/\.[^/.]+$/, "") : undefined,
        overwrite: false,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve({
          secureUrl: result.secure_url,
          resourceType: result.resource_type,
          bytes: result.bytes,
          format: result.format,
        });
      }
    );
    stream.end(buffer);
  });
}

module.exports = { cloudinary, uploadBuffer, mapResourceType };

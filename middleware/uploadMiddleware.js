import multer from 'multer';

const storage = multer.memoryStorage();

const allowed = [
  // images
  'image/jpeg','image/png','image/gif','image/webp','image/avif','image/jpg','image/svg+xml','image/heic','image/heif','image/heic-sequence','image/heif-sequence',
  // video
  'video/mp4','video/quicktime','video/webm','video/ogg',
  // audio/voice
  'audio/mpeg','audio/mp3','audio/wav','audio/ogg','audio/webm','audio/aac'
];

function fileFilter(req, file, cb) {
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error('Unsupported file type: ' + file.mimetype));
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB per file
    files: 6 // max attachments per thread
  }
});

export const uploadThreadMedia = upload.array('media', 6);

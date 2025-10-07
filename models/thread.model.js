import mongoose from 'mongoose';

const mediaSubSchema = new mongoose.Schema({
  key: { type: String, required: true },          // S3 object key for future deletion
  type: { type: String, enum: ['image', 'video', 'audio', 'other'], required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },         // bytes
  duration: { type: Number },                     // seconds (only for audio/video)
  width: { type: Number },                        // optional for images/video
  height: { type: Number },
  thumbnailUrl: { type: String },                 // future video/image optimization
}, { _id: false, timestamps: false });

const threadSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, maxlength: 500 },
  media: { type: [mediaSubSchema], default: [] },
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });

threadSchema.pre('validate', function(next) {
  if (!this.content && (!this.media || this.media.length === 0)) {
    return next(new Error('Content or media required'));
  }
  next();
});

threadSchema.index({ createdAt: -1 });

export const Thread = mongoose.model('Thread', threadSchema);

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  rating: { type: Number, required: true, min: 1, max: 5, index: true },
  comment: { type: String, trim: true, maxlength: 500 },
  photos: [{ type: String }],
  helpfulVotes: { type: Number, default: 0 },
  isModerated: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false, index: true }
}, { timestamps: true });

reviewSchema.index({ restaurant: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);

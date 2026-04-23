const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true, index: true },
  description: { type: String, trim: true },
  isDeleted: { type: Boolean, default: false, index: true }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);

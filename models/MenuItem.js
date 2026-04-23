const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
  name: { type: String, required: true, trim: true, index: true },
  description: { type: String, trim: true },
  category: { type: String, trim: true, index: true },
  price: { type: Number, required: true, min: 0, index: true },
  image: { type: String, trim: true },
  isVegetarian: { type: Boolean, default: false },
  available: { type: Boolean, default: true, index: true },
  isDeleted: { type: Boolean, default: false, index: true }
}, { timestamps: true });

module.exports = mongoose.model('MenuItem', menuItemSchema);

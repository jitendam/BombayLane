const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, index: true },
  description: { type: String, trim: true },
  cuisine: [{ type: String, trim: true, index: true }],
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  location: {
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true, index: true },
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  openingHours: {
    open: { type: String, default: '09:00' },
    close: { type: String, default: '22:00' }
  },
  averageRating: { type: Number, default: 0, min: 0, max: 5, index: true },
  deliveryTimeMinutes: { type: Number, default: 30 },
  isOpen: { type: Boolean, default: true, index: true },
  isDeleted: { type: Boolean, default: false, index: true }
}, { timestamps: true });

restaurantSchema.index({ name: 'text', description: 'text', 'location.city': 'text' });

module.exports = mongoose.model('Restaurant', restaurantSchema);

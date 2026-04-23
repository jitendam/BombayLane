const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password: { type: String, required: true, minlength: 8, select: false },
  role: {
    type: String,
    enum: ['customer', 'restaurant_owner', 'admin'],
    default: 'customer',
    index: true
  },
  phone: { type: String, trim: true },
  address: { type: String, trim: true },
  preferences: {
    cuisines: [{ type: String, trim: true }],
    dietary: [{ type: String, trim: true }]
  },
  isDeleted: { type: Boolean, default: false, index: true }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);

const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    designation: {
      type: String,
      required: [true, 'Designation is required'],
      trim: true,
      // e.g. "Front Desk Manager", "Head Chef", "Housekeeping Supervisor"
    },
    department: {
      type: String,
      enum: ['front_desk', 'kitchen', 'housekeeping', 'management', 'security', 'maintenance'],
      required: true,
    },
    contactNumber: {
      type: String,
      required: [true, 'Contact number is required'],
      trim: true,
    },
    email: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
    },
    photo: {
      type: String,
      default: null,
    },
    shiftTiming: {
      type: String,
      default: null,
      // e.g. "9 AM - 5 PM"
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Staff', staffSchema);

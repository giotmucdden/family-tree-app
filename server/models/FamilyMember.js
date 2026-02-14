const mongoose = require('mongoose');

const familyMemberSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      default: 'other',
    },
    birthDate: Date,
    deathDate: Date,
    isLiving: {
      type: Boolean,
      default: true,
    },
    photo: String,
    bio: String,
    birthPlace: String,
    occupation: String,
    email: String,
    phone: String,

    // Parents
    fatherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FamilyMember',
      default: null,
    },
    motherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FamilyMember',
      default: null,
    },

    // Supports multiple marriages (current, divorced, widowed)
    spouses: [
      {
        memberId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'FamilyMember',
        },
        status: {
          type: String,
          enum: ['married', 'divorced', 'widowed'],
          default: 'married',
        },
      },
    ],

    childrenIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FamilyMember',
      },
    ],

    familyTree: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FamilyTree',
      required: true,
    },

    position: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FamilyMember', familyMemberSchema);

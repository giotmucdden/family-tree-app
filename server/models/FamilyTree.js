const mongoose = require('mongoose');

const familyTreeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      default: 'My Family Tree',
    },
    description: String,
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FamilyMember',
      },
    ],
    rootMember: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FamilyMember',
      default: null,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FamilyTree', familyTreeSchema);

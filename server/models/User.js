const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    facebookId: {
      type: String,
      required: true,
      unique: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    firstName: String,
    lastName: String,
    email: String,
    profilePhoto: String,
    familyTrees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FamilyTree',
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);

/**
 * View all registered users
 * Usage: cd server && node view-users.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function viewUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    const users = await User.find({}).select('-password -resetPasswordToken').sort({ createdAt: -1 });

    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  REGISTERED USERS (${users.length} total)`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (users.length === 0) {
      console.log('  No users found.\n');
    } else {
      users.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.displayName}`);
        console.log(`     Email: ${user.email || '(no email)'}`);
        console.log(`     ID: ${user._id}`);
        if (user.facebookId) console.log(`     Facebook ID: ${user.facebookId}`);
        console.log(`     Created: ${user.createdAt ? user.createdAt.toLocaleString('vi-VN') : 'N/A'}`);
        console.log(`     Trees: ${user.familyTrees?.length || 0}`);
        console.log('');
      });
    }

    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

viewUsers();

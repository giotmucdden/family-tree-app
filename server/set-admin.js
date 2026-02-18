/**
 * Set admin role for a user
 * Run: node set-admin.js admin@giapha.app
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function setAdmin() {
  const email = process.argv[2] || 'admin@giapha.app';

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    console.log(`User with email "${email}" not found`);
    process.exit(1);
  }

  user.role = 'admin';
  await user.save();

  console.log(`✅ User "${user.displayName}" (${user.email}) is now an admin`);
  console.log(`   Role: ${user.role}`);
  console.log(`   LinkedMemberId: ${user.linkedMemberId || 'none'}`);

  await mongoose.disconnect();
}

setAdmin().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

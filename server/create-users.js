/**
 * Create users script
 * Run: node create-users.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const FamilyMember = require('./models/FamilyMember');

async function createUsers() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // 1. Create Admin user
  const adminEmail = 'admin@giapha.app';
  let adminUser = await User.findOne({ email: adminEmail });

  if (adminUser) {
    // Update existing admin
    adminUser.role = 'admin';
    adminUser.password = 'admin';
    await adminUser.save();
    console.log(`✅ Updated admin user: ${adminEmail}`);
  } else {
    // Create new admin
    adminUser = new User({
      email: adminEmail,
      password: 'admin',
      displayName: 'Quản Trị Viên',
      firstName: 'Admin',
      lastName: 'Gia Phả',
      role: 'admin',
      facebookId: 'admin_user_001', // Unique facebookId to avoid duplicate key error
    });
    await adminUser.save();
    console.log(`✅ Created admin user: ${adminEmail}`);
  }
  console.log(`   Role: ${adminUser.role}`);

  // 2. Create Member user for Nguyễn Chính Trực
  const memberEmail = 'trucnguyen1116@yahoo.com';
  let memberUser = await User.findOne({ email: memberEmail });

  // Find the linked member by name or email
  const linkedMember = await FamilyMember.findOne({
    $or: [
      { email: memberEmail },
      {
        firstName: { $regex: /trực/i },
        lastName: { $regex: /nguyễn/i }
      }
    ]
  });

  if (memberUser) {
    // Update existing member
    memberUser.role = 'member';
    memberUser.password = '123';
    memberUser.linkedMemberId = linkedMember?._id || null;
    await memberUser.save();
    console.log(`✅ Updated member user: ${memberEmail}`);
  } else {
    // Create new member
    memberUser = new User({
      email: memberEmail,
      password: '123',
      displayName: 'Nguyễn Chính Trực',
      firstName: 'Trực',
      lastName: 'Nguyễn Chính',
      role: 'member',
      linkedMemberId: linkedMember?._id || null,
      facebookId: 'member_truc_001', // Unique facebookId to avoid duplicate key error
    });
    await memberUser.save();
    console.log(`✅ Created member user: ${memberEmail}`);
  }
  console.log(`   Role: ${memberUser.role}`);
  console.log(`   LinkedMemberId: ${memberUser.linkedMemberId || 'none'}`);
  if (linkedMember) {
    console.log(`   Linked to member: ${linkedMember.lastName} ${linkedMember.firstName}`);
  }

  console.log('\n📋 Summary:');
  console.log('─────────────────────────────────────');
  console.log(`Admin:  ${adminEmail} / password: admin`);
  console.log(`Member: ${memberEmail} / password: 123`);
  console.log('─────────────────────────────────────');

  await mongoose.disconnect();
}

createUsers().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

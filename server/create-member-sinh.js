/**
 * Create member user for Trần Trung Sinh Thomas
 * Run with: node create-member-sinh.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const FamilyMember = require('./models/FamilyMember');

async function createMemberUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the member by name (Trần Trung Sinh or Thomas)
    const member = await FamilyMember.findOne({
      $or: [
        { lastName: 'Trần', firstName: { $regex: /sinh/i } },
        { lastName: 'Trần', vnName: { $regex: /sinh/i } },
        { saintName: { $regex: /thomas/i }, lastName: 'Trần' }
      ]
    });

    if (!member) {
      console.log('Member not found. Searching all members with lastName "Trần"...');
      const allTran = await FamilyMember.find({ lastName: { $regex: /trần/i } });
      console.log('Found members:');
      allTran.forEach(m => {
        console.log(`  - ${m.saintName || ''} ${m.lastName} ${m.middleName || ''} ${m.vnName || ''} ${m.firstName} | Email: ${m.email || 'N/A'} | ID: ${m._id}`);
      });
      process.exit(1);
    }

    console.log(`Found member: ${member.saintName || ''} ${member.lastName} ${member.middleName || ''} ${member.vnName || ''} ${member.firstName}`);
    console.log(`Member ID: ${member._id}`);
    console.log(`Member Email: ${member.email || 'NOT SET'}`);

    if (!member.email) {
      console.log('\nERROR: Member does not have an email address set in their profile.');
      console.log('Please add an email to the member profile first.');
      process.exit(1);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: member.email.toLowerCase() });
    if (existingUser) {
      console.log(`\nUser already exists with email: ${member.email}`);
      console.log('Updating linkedMemberId and role...');
      existingUser.linkedMemberId = member._id;
      existingUser.role = 'member';
      await existingUser.save();
      console.log('User updated successfully!');
      process.exit(0);
    }

    // Create the user
    const hashedPassword = await bcrypt.hash('myGeni@1965', 10);
    const user = await User.create({
      name: `${member.saintName || ''} ${member.lastName} ${member.firstName}`.trim(),
      email: member.email.toLowerCase(),
      password: hashedPassword,
      role: 'member',
      linkedMemberId: member._id,
      facebookId: `member_sinh_${Date.now()}`,
    });

    console.log('\n✅ Member user created successfully!');
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: myGeni@1965`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Linked Member ID: ${user.linkedMemberId}`);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

createMemberUser();

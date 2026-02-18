/**
 * Migration script to restore database to Railway production
 * Run with: railway run node migrate-to-production.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const FamilyTree = require('./models/FamilyTree');
const FamilyMember = require('./models/FamilyMember');

// Import data from JSON files
const usersData = require('./migration-data-users.json');
const treesData = require('./migration-data-trees.json');
const membersData = require('./migration-data-members.json');

async function migrate() {
  try {
    console.log('Connecting to MongoDB...');
    console.log('URI:', process.env.MONGO_URI ? 'Found' : 'NOT FOUND');

    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    console.log('\nClearing existing data...');
    await User.deleteMany({});
    await FamilyTree.deleteMany({});
    await FamilyMember.deleteMany({});
    console.log('Cleared all collections');

    // Insert users
    console.log('\nInserting users...');
    for (const user of usersData) {
      // Convert $oid format to string
      const userData = {
        ...user,
        _id: user._id.$oid || user._id,
        familyTrees: (user.familyTrees || []).map(t => t.$oid || t),
        linkedMemberId: user.linkedMemberId?.$oid || user.linkedMemberId || null,
        createdAt: user.createdAt?.$date ? new Date(user.createdAt.$date) : user.createdAt,
        updatedAt: user.updatedAt?.$date ? new Date(user.updatedAt.$date) : user.updatedAt,
      };
      await User.create(userData);
      console.log(`  Created user: ${userData.email}`);
    }

    // Insert trees
    console.log('\nInserting trees...');
    for (const tree of treesData) {
      const treeData = {
        ...tree,
        _id: tree._id.$oid || tree._id,
        owner: tree.owner.$oid || tree.owner,
        rootMember: tree.rootMember?.$oid || tree.rootMember || null,
        members: (tree.members || []).map(m => m.$oid || m),
        createdAt: tree.createdAt?.$date ? new Date(tree.createdAt.$date) : tree.createdAt,
        updatedAt: tree.updatedAt?.$date ? new Date(tree.updatedAt.$date) : tree.updatedAt,
      };
      await FamilyTree.create(treeData);
      console.log(`  Created tree: ${treeData.name}`);
    }

    // Insert members
    console.log('\nInserting members...');
    let memberCount = 0;
    for (const member of membersData) {
      const memberData = {
        ...member,
        _id: member._id.$oid || member._id,
        familyTree: member.familyTree.$oid || member.familyTree,
        fatherId: member.fatherId?.$oid || member.fatherId || null,
        motherId: member.motherId?.$oid || member.motherId || null,
        childrenIds: (member.childrenIds || []).map(c => c.$oid || c),
        spouses: (member.spouses || []).map(sp => ({
          memberId: sp.memberId?.$oid || sp.memberId,
          status: sp.status || 'married',
          _id: sp._id?.$oid || sp._id,
        })),
        birthDate: member.birthDate?.$date ? new Date(member.birthDate.$date) : member.birthDate,
        deathDate: member.deathDate?.$date ? new Date(member.deathDate.$date) : member.deathDate,
        createdAt: member.createdAt?.$date ? new Date(member.createdAt.$date) : member.createdAt,
        updatedAt: member.updatedAt?.$date ? new Date(member.updatedAt.$date) : member.updatedAt,
      };
      await FamilyMember.create(memberData);
      memberCount++;
    }
    console.log(`  Created ${memberCount} members`);

    console.log('\n✅ Migration complete!');
    console.log(`   Users: ${usersData.length}`);
    console.log(`   Trees: ${treesData.length}`);
    console.log(`   Members: ${membersData.length}`);

    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();

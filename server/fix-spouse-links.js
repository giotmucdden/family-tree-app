/**
 * Fix bidirectional spouse links for all existing members
 * Run with: node fix-spouse-links.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const FamilyMember = require('./models/FamilyMember');

async function fixSpouseLinks() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const members = await FamilyMember.find({});
    console.log(`Found ${members.length} members`);

    let fixedCount = 0;

    for (const member of members) {
      if (!member.spouses || member.spouses.length === 0) continue;

      for (const spouse of member.spouses) {
        const spouseId = typeof spouse.memberId === 'object'
          ? spouse.memberId._id?.toString()
          : spouse.memberId?.toString();

        if (!spouseId) continue;

        // Check if the spouse has this member in their spouse list
        const spouseMember = await FamilyMember.findById(spouseId);
        if (!spouseMember) {
          console.log(`Spouse ${spouseId} not found for member ${member._id}`);
          continue;
        }

        const hasReverseLink = (spouseMember.spouses || []).some(sp => {
          const id = typeof sp.memberId === 'object'
            ? sp.memberId._id?.toString()
            : sp.memberId?.toString();
          return id === member._id.toString();
        });

        if (!hasReverseLink) {
          // Add reverse link
          await FamilyMember.findByIdAndUpdate(spouseId, {
            $push: {
              spouses: {
                memberId: member._id,
                status: spouse.status || 'married'
              }
            }
          });
          console.log(`Added reverse spouse link: ${spouseMember.lastName} ${spouseMember.firstName} <-> ${member.lastName} ${member.firstName}`);
          fixedCount++;
        }
      }
    }

    console.log(`\nFixed ${fixedCount} missing spouse links`);
    console.log('Done!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

fixSpouseLinks();

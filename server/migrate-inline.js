/**
 * Migration script that connects to production directly using public URL
 */
require('dotenv').config();
const mongoose = require('mongoose');

// Data exported from local
const usersData = require('./migration-data-users.json');
const treesData = require('./migration-data-trees.json');
const membersData = require('./migration-data-members.json');

// Public MongoDB URL for Railway (replace internal with public)
const PROD_MONGO_URL = process.env.RAILWAY_MONGO_PUBLIC_URL || process.argv[2];

async function migrate() {
  if (!PROD_MONGO_URL) {
    console.error('Please provide the public MongoDB URL as argument or RAILWAY_MONGO_PUBLIC_URL env var');
    process.exit(1);
  }

  try {
    console.log('Connecting to production MongoDB...');
    await mongoose.connect(PROD_MONGO_URL);
    console.log('Connected!');

    const db = mongoose.connection.db;

    // Clear existing data
    console.log('Clearing existing data...');
    await db.collection('users').deleteMany({});
    await db.collection('familytrees').deleteMany({});
    await db.collection('familymembers').deleteMany({});

    // Insert users
    console.log('Inserting users...');
    if (usersData.length > 0) {
      const users = usersData.map(u => ({
        ...u,
        _id: new mongoose.Types.ObjectId(u._id.$oid || u._id),
      }));
      await db.collection('users').insertMany(users);
    }
    console.log(\`  Inserted \${usersData.length} users\`);

    // Insert trees
    console.log('Inserting trees...');
    if (treesData.length > 0) {
      const trees = treesData.map(t => ({
        ...t,
        _id: new mongoose.Types.ObjectId(t._id.$oid || t._id),
      }));
      await db.collection('familytrees').insertMany(trees);
    }
    console.log(\`  Inserted \${treesData.length} trees\`);

    // Insert members
    console.log('Inserting members...');
    if (membersData.length > 0) {
      const members = membersData.map(m => ({
        ...m,
        _id: new mongoose.Types.ObjectId(m._id.$oid || m._id),
      }));
      await db.collection('familymembers').insertMany(members);
    }
    console.log(\`  Inserted \${membersData.length} members\`);

    console.log('\\n✅ Migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }
}

migrate();

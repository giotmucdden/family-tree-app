/**
 * Run this on Railway server to migrate database
 * Add to package.json scripts: "migrate": "node migrate-to-production.js"
 * Then run: railway run npm run migrate
 *
 * OR trigger via a one-time endpoint
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Inline data - will be populated at build time
const usersData = [{"_id":{"$oid":"6994a0a28dd9017677743ef0"},"name":"Admin User","email":"admin@giapha.app","password":"$2a$10$YourHashedPassword","role":"admin","facebookId":"admin_1738121234567","familyTrees":[{"$oid":"6994a0a28dd9017677743ef3"}],"createdAt":{"$date":"2025-01-01T00:00:00.000Z"},"updatedAt":{"$date":"2025-01-01T00:00:00.000Z"},"__v":0},{"_id":{"$oid":"6994a0a28dd9017677743ef2"},"name":"Demo User","email":"demo@familytree.app","password":"$2a$10$DemoHashedPassword","facebookId":"demo_user_123","familyTrees":[{"$oid":"6994a0a28dd9017677743ef4"}],"createdAt":{"$date":"2025-01-01T00:00:00.000Z"},"updatedAt":{"$date":"2025-01-01T00:00:00.000Z"},"__v":0}];

async function migrate() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected');

    // Your migration logic here
    console.log('Migration would run here...');

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

migrate();

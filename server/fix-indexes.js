/**
 * Fix MongoDB indexes for User collection
 * Run this script if you're getting registration errors due to old indexes
 *
 * Usage: cd server && node fix-indexes.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function fixIndexes() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const User = mongoose.connection.collection('users');

    // List existing indexes
    const indexes = await User.indexes();
    console.log('\nExisting indexes:', indexes.map(i => i.name).join(', '));

    // Drop the email index if it exists and is not sparse
    for (const index of indexes) {
      if (index.key && index.key.email && !index.sparse) {
        console.log(`\nDropping non-sparse email index: ${index.name}`);
        try {
          await User.dropIndex(index.name);
          console.log('✓ Index dropped successfully');
        } catch (e) {
          console.log('Could not drop index:', e.message);
        }
      }
    }

    // The User model will recreate the index as sparse when the server starts
    console.log('\n✓ Done! Now restart your server.');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

fixIndexes();

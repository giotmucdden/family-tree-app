require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const passport = require('./config/passport');

const authRoutes = require('./routes/auth');
const treeRoutes = require('./routes/trees');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy on Render (needed for secure cookies behind HTTPS)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  })
);

// Sessions
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'fallback-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  })
);

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/trees', treeRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debug user endpoint (temporary)
app.post('/api/debug-user', async (req, res) => {
  const { secret, email } = req.body;

  if (secret !== 'migrate-fam-tree-2024') {
    return res.status(403).json({ error: 'Invalid secret' });
  }

  try {
    const User = require('./models/User');
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      email: user.email,
      hasPassword: !!user.password,
      passwordLength: user.password ? user.password.length : 0,
      passwordPrefix: user.password ? user.password.substring(0, 10) : null,
      role: user.role,
      facebookId: user.facebookId,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Password reset endpoint for admin use
app.post('/api/reset-password', async (req, res) => {
  const { secret, email, newPassword } = req.body;

  if (secret !== 'migrate-fam-tree-2024') {
    return res.status(403).json({ error: 'Invalid secret' });
  }

  try {
    const bcrypt = require('bcryptjs');
    const User = require('./models/User');

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash password and update directly to avoid double-hashing from pre-save hook
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword } }
    );

    res.json({ success: true, message: `Password updated for ${email}` });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create user endpoint for admin use
app.post('/api/create-user', async (req, res) => {
  const { secret, email, password, name, role, linkedMemberId, familyTrees } = req.body;

  if (secret !== 'migrate-fam-tree-2024') {
    return res.status(403).json({ error: 'Invalid secret' });
  }

  try {
    const bcrypt = require('bcryptjs');
    const mongoose = require('mongoose');
    const User = require('./models/User');

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user directly to bypass pre-save hook
    const userData = {
      _id: new mongoose.Types.ObjectId(),
      email: email.toLowerCase(),
      password: hashedPassword,
      name: name || email.split('@')[0],
      role: role || 'member',
      facebookId: `local_${Date.now()}`,
      linkedMemberId: linkedMemberId ? new mongoose.Types.ObjectId(linkedMemberId) : null,
      familyTrees: (familyTrees || []).map(t => new mongoose.Types.ObjectId(t)),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await User.collection.insertOne(userData);
    res.json({ success: true, message: `User ${email} created`, userId: userData._id });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Migration endpoint - runs within Railway network to access internal MongoDB
app.post('/api/migrate', async (req, res) => {
  const { secret } = req.body;

  // Simple security check - require a secret key
  if (secret !== 'migrate-fam-tree-2024') {
    return res.status(403).json({ error: 'Invalid migration secret' });
  }

  try {
    const User = require('./models/User');
    const FamilyTree = require('./models/FamilyTree');
    const FamilyMember = require('./models/FamilyMember');

    // Import data from JSON files
    const usersData = require('./migration-data-users.json');
    const treesData = require('./migration-data-trees.json');
    const membersData = require('./migration-data-members.json');

    const results = {
      users: { before: 0, after: 0 },
      trees: { before: 0, after: 0 },
      members: { before: 0, after: 0 },
    };

    // Count existing data
    results.users.before = await User.countDocuments();
    results.trees.before = await FamilyTree.countDocuments();
    results.members.before = await FamilyMember.countDocuments();

    // Clear existing data
    await User.deleteMany({});
    await FamilyTree.deleteMany({});
    await FamilyMember.deleteMany({});

    // Insert users - use insertOne to bypass pre-save hook (passwords already hashed)
    const mongoose = require('mongoose');
    for (const user of usersData) {
      const userData = {
        ...user,
        _id: new mongoose.Types.ObjectId(user._id.$oid || user._id),
        familyTrees: (user.familyTrees || []).map(t => new mongoose.Types.ObjectId(t.$oid || t)),
        linkedMemberId: user.linkedMemberId ? new mongoose.Types.ObjectId(user.linkedMemberId.$oid || user.linkedMemberId) : null,
        createdAt: user.createdAt?.$date ? new Date(user.createdAt.$date) : new Date(user.createdAt),
        updatedAt: user.updatedAt?.$date ? new Date(user.updatedAt.$date) : new Date(user.updatedAt),
      };
      // Use collection.insertOne to bypass Mongoose middleware (password already hashed)
      await User.collection.insertOne(userData);
    }
    results.users.after = await User.countDocuments();

    // Insert trees
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
    }
    results.trees.after = await FamilyTree.countDocuments();

    // Insert members
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
    }
    results.members.after = await FamilyMember.countDocuments();

    res.json({
      success: true,
      message: 'Migration completed successfully',
      results,
    });
  } catch (err) {
    console.error('Migration error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Serve React build in production ──────────────────────
const clientBuildPath = path.join(__dirname, '..', 'client', 'build');
app.use(express.static(clientBuildPath));

// All non-API routes → React's index.html (client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});

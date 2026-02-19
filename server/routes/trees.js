const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const FamilyTree = require('../models/FamilyTree');
const FamilyMember = require('../models/FamilyMember');
const { ensureAuth } = require('../middleware/auth');

router.use(ensureAuth);

// ============ FAMILY TREE ROUTES ============

router.get('/', async (req, res) => {
  try {
    // Data isolation rules:
    // - Demo users only see their own trees (isolated demo data)
    // - Admin and Member users see ALL non-demo trees (shared data)
    const userId = req.user._id;
    const userEmail = req.user.email?.toLowerCase() || '';
    const isDemo = userEmail.includes('demo');

    let query;
    if (isDemo) {
      // Demo user: only see their own trees
      query = { owner: userId };
    } else {
      // Admin/Member users: see all trees except demo users' trees
      // First get all demo user IDs to exclude
      const User = require('../models/User');
      const demoUsers = await User.find({ email: { $regex: /demo/i } }).select('_id');
      const demoUserIds = demoUsers.map(u => u._id);

      query = { owner: { $nin: demoUserIds } };
    }

    const trees = await FamilyTree.find(query).populate('members');
    res.json(trees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    const tree = await FamilyTree.create({
      name: name || 'My Family Tree',
      description,
      owner: req.user._id,
    });
    req.user.familyTrees.push(tree._id);
    await req.user.save();
    res.status(201).json(tree);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:treeId', async (req, res) => {
  try {
    // All users can view any tree
    const tree = await FamilyTree.findById(req.params.treeId).populate({
      path: 'members',
      populate: [
        { path: 'fatherId', select: 'firstName lastName middleName vnName gender' },
        { path: 'motherId', select: 'firstName lastName middleName vnName gender' },
        { path: 'spouses.memberId', select: 'firstName lastName middleName vnName gender' },
        { path: 'childrenIds', select: 'firstName lastName middleName vnName gender' },
      ],
    });

    if (!tree) {
      return res.status(404).json({ error: 'Family tree not found' });
    }
    res.json(tree);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:treeId', async (req, res) => {
  try {
    const tree = await FamilyTree.findOneAndUpdate(
      { _id: req.params.treeId, owner: req.user._id },
      { $set: req.body },
      { new: true }
    );
    if (!tree) {
      return res.status(404).json({ error: 'Family tree not found' });
    }
    res.json(tree);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:treeId', async (req, res) => {
  try {
    const tree = await FamilyTree.findOne({
      _id: req.params.treeId,
      owner: req.user._id,
    });
    if (!tree) {
      return res.status(404).json({ error: 'Family tree not found' });
    }
    await FamilyMember.deleteMany({ familyTree: tree._id });
    req.user.familyTrees.pull(tree._id);
    await req.user.save();
    await FamilyTree.findByIdAndDelete(tree._id);
    res.json({ message: 'Family tree deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ FAMILY MEMBER ROUTES ============

router.post('/:treeId/members', async (req, res) => {
  try {
    // Allow any non-demo user to add members to any non-demo tree
    // Edit permissions will be checked based on downstream rules
    const tree = await FamilyTree.findById(req.params.treeId);
    if (!tree) {
      return res.status(404).json({ error: 'Family tree not found' });
    }

    // Check if user can add members (admin can add anywhere, member can add as children of their downstream)
    const userRole = req.user.role;
    const linkedMemberId = req.user.linkedMemberId?.toString();

    if (userRole !== 'admin') {
      // Member user: can only add children to their downstream members
      if (!linkedMemberId) {
        return res.status(403).json({ error: 'Bạn không có quyền thêm thành viên' });
      }

      // If adding as child of someone, check if that parent is in downstream
      const parentId = req.body.fatherId || req.body.motherId;
      if (parentId) {
        const allMembers = await FamilyMember.find({ familyTree: tree._id });
        const downstreamIds = new Set();
        downstreamIds.add(linkedMemberId);

        const findChildren = (pId) => {
          allMembers.forEach((m) => {
            const fatherId = m.fatherId?.toString();
            const motherId = m.motherId?.toString();
            if (fatherId === pId || motherId === pId) {
              const childId = m._id.toString();
              if (!downstreamIds.has(childId)) {
                downstreamIds.add(childId);
                findChildren(childId);
              }
            }
          });
        };
        findChildren(linkedMemberId);

        if (!downstreamIds.has(parentId.toString())) {
          return res.status(403).json({ error: 'Bạn chỉ có thể thêm con cho thành viên trong phạm vi của bạn' });
        }
      }
    }

    const memberData = { ...req.body, familyTree: tree._id };
    const member = await FamilyMember.create(memberData);

    tree.members.push(member._id);
    if (tree.members.length === 1) {
      tree.rootMember = member._id;
    }
    await tree.save();

    // Add child to father's childrenIds
    if (req.body.fatherId) {
      await FamilyMember.findByIdAndUpdate(req.body.fatherId, {
        $push: { childrenIds: member._id },
      });
    }

    // Add child to mother's childrenIds
    if (req.body.motherId) {
      await FamilyMember.findByIdAndUpdate(req.body.motherId, {
        $push: { childrenIds: member._id },
      });
    }

    // If spouses provided, link bidirectionally
    if (req.body.spouses && req.body.spouses.length > 0) {
      for (const sp of req.body.spouses) {
        await FamilyMember.findByIdAndUpdate(sp.memberId, {
          $push: {
            spouses: { memberId: member._id, status: sp.status || 'married' },
          },
        });
      }
    }

    const populated = await FamilyMember.findById(member._id)
      .populate('fatherId', 'firstName lastName middleName vnName gender')
      .populate('motherId', 'firstName lastName middleName vnName gender')
      .populate('spouses.memberId', 'firstName lastName middleName vnName gender')
      .populate('childrenIds', 'firstName lastName middleName vnName gender');

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:treeId/members/:memberId', async (req, res) => {
  try {
    const memberId = req.params.memberId;
    const treeId = req.params.treeId;

    // Check authorization: admin can edit all, member can edit self and downstream
    const userRole = req.user.role;
    const linkedMemberId = req.user.linkedMemberId?.toString();

    if (userRole !== 'admin' && linkedMemberId) {
      // Get all members to check downstream
      const allMembers = await FamilyMember.find({ familyTree: treeId });

      // Build downstream set from linked member
      const downstreamIds = new Set();
      downstreamIds.add(linkedMemberId);

      const findChildren = (parentId) => {
        allMembers.forEach((m) => {
          const fatherId = m.fatherId?.toString();
          const motherId = m.motherId?.toString();
          if (fatherId === parentId || motherId === parentId) {
            const childId = m._id.toString();
            if (!downstreamIds.has(childId)) {
              downstreamIds.add(childId);
              findChildren(childId);
            }
          }
        });
      };
      findChildren(linkedMemberId);

      if (!downstreamIds.has(memberId)) {
        return res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa thành viên này' });
      }
    } else if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa' });
    }

    // Handle bidirectional parent-child linking when fatherId or motherId changes
    if (req.body.fatherId !== undefined || req.body.motherId !== undefined) {
      const currentMember = await FamilyMember.findById(memberId);

      // Handle fatherId changes
      if (req.body.fatherId !== undefined) {
        const oldFatherId = currentMember?.fatherId?.toString() || null;
        const newFatherId = req.body.fatherId || null;

        // Remove from old father's childrenIds
        if (oldFatherId && oldFatherId !== newFatherId) {
          await FamilyMember.findByIdAndUpdate(oldFatherId, {
            $pull: { childrenIds: memberId }
          });
        }

        // Add to new father's childrenIds
        if (newFatherId && newFatherId !== oldFatherId) {
          await FamilyMember.findByIdAndUpdate(newFatherId, {
            $addToSet: { childrenIds: memberId }
          });
        }
      }

      // Handle motherId changes
      if (req.body.motherId !== undefined) {
        const oldMotherId = currentMember?.motherId?.toString() || null;
        const newMotherId = req.body.motherId || null;

        // Remove from old mother's childrenIds
        if (oldMotherId && oldMotherId !== newMotherId) {
          await FamilyMember.findByIdAndUpdate(oldMotherId, {
            $pull: { childrenIds: memberId }
          });
        }

        // Add to new mother's childrenIds
        if (newMotherId && newMotherId !== oldMotherId) {
          await FamilyMember.findByIdAndUpdate(newMotherId, {
            $addToSet: { childrenIds: memberId }
          });
        }
      }
    }

    // Handle bidirectional spouse linking
    if (req.body.spouses !== undefined) {
      const currentMember = await FamilyMember.findById(memberId);
      const oldSpouseIds = (currentMember?.spouses || []).map(sp =>
        typeof sp.memberId === 'object' ? sp.memberId._id?.toString() : sp.memberId?.toString()
      ).filter(Boolean);

      const newSpouses = req.body.spouses || [];
      const newSpouseIds = newSpouses.map(sp => sp.memberId).filter(Boolean);

      // Find spouses to remove (in old but not in new)
      const toRemove = oldSpouseIds.filter(id => !newSpouseIds.includes(id));

      // Find spouses to add (in new but not in old)
      const toAdd = newSpouses.filter(sp => sp.memberId && !oldSpouseIds.includes(sp.memberId));

      // Find spouses to update (in both, but maybe status changed)
      const toUpdate = newSpouses.filter(sp => sp.memberId && oldSpouseIds.includes(sp.memberId));

      // Remove this member from old spouses' spouse lists
      for (const spouseId of toRemove) {
        await FamilyMember.findByIdAndUpdate(spouseId, {
          $pull: { spouses: { memberId: memberId } }
        });
      }

      // Add this member to new spouses' spouse lists
      for (const sp of toAdd) {
        await FamilyMember.findByIdAndUpdate(sp.memberId, {
          $push: { spouses: { memberId: memberId, status: sp.status || 'married' } }
        });
      }

      // Update status on both sides for existing spouses
      for (const sp of toUpdate) {
        // Update the other spouse's record with the new status
        await FamilyMember.findOneAndUpdate(
          { _id: sp.memberId, 'spouses.memberId': memberId },
          { $set: { 'spouses.$.status': sp.status || 'married' } }
        );
      }
    }

    // Handle linkedChildrenIds - update children's parent references
    if (req.body.linkedChildrenIds) {
      const linkedChildrenIds = req.body.linkedChildrenIds;
      delete req.body.linkedChildrenIds;

      // Get current member to determine gender for parent assignment
      const currentMember = await FamilyMember.findById(memberId);
      if (currentMember) {
        const parentField = currentMember.gender === 'female' ? 'motherId' : 'fatherId';

        // Get existing children
        const existingChildIds = (currentMember.childrenIds || []).map(c =>
          typeof c === 'object' ? c._id.toString() : c.toString()
        );

        // Find children to add (in linkedChildrenIds but not in existingChildIds)
        const toAdd = linkedChildrenIds.filter(id => !existingChildIds.includes(id));

        // Find children to remove (in existingChildIds but not in linkedChildrenIds)
        const toRemove = existingChildIds.filter(id => !linkedChildrenIds.includes(id));

        // Add new children - set their parent ID and add to childrenIds
        for (const childId of toAdd) {
          await FamilyMember.findByIdAndUpdate(childId, {
            $set: { [parentField]: memberId }
          });
          await FamilyMember.findByIdAndUpdate(memberId, {
            $addToSet: { childrenIds: childId }
          });
        }

        // Remove children - unset their parent ID and remove from childrenIds
        for (const childId of toRemove) {
          await FamilyMember.findByIdAndUpdate(childId, {
            $unset: { [parentField]: '' }
          });
          await FamilyMember.findByIdAndUpdate(memberId, {
            $pull: { childrenIds: childId }
          });
        }
      }
    }

    const member = await FamilyMember.findOneAndUpdate(
      { _id: memberId, familyTree: treeId },
      { $set: req.body },
      { new: true }
    )
      .populate('fatherId', 'firstName lastName middleName vnName gender')
      .populate('motherId', 'firstName lastName middleName vnName gender')
      .populate('spouses.memberId', 'firstName lastName middleName vnName gender')
      .populate('childrenIds', 'firstName lastName middleName vnName gender');

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.json(member);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:treeId/members/:memberId', async (req, res) => {
  try {
    const memberId = req.params.memberId;
    const treeId = req.params.treeId;

    // Check authorization: admin can delete all, member can delete self and downstream
    const userRole = req.user.role;
    const linkedMemberId = req.user.linkedMemberId?.toString();

    if (userRole !== 'admin' && linkedMemberId) {
      // Get all members to check downstream
      const allMembers = await FamilyMember.find({ familyTree: treeId });

      // Build downstream set from linked member
      const downstreamIds = new Set();
      downstreamIds.add(linkedMemberId);

      const findChildren = (parentId) => {
        allMembers.forEach((m) => {
          const fatherId = m.fatherId?.toString();
          const motherId = m.motherId?.toString();
          if (fatherId === parentId || motherId === parentId) {
            const childId = m._id.toString();
            if (!downstreamIds.has(childId)) {
              downstreamIds.add(childId);
              findChildren(childId);
            }
          }
        });
      };
      findChildren(linkedMemberId);

      if (!downstreamIds.has(memberId)) {
        return res.status(403).json({ error: 'Bạn không có quyền xóa thành viên này' });
      }
    } else if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Bạn không có quyền xóa' });
    }

    const member = await FamilyMember.findOne({
      _id: memberId,
      familyTree: treeId,
    });
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (member.fatherId) {
      await FamilyMember.findByIdAndUpdate(member.fatherId, {
        $pull: { childrenIds: member._id },
      });
    }
    if (member.motherId) {
      await FamilyMember.findByIdAndUpdate(member.motherId, {
        $pull: { childrenIds: member._id },
      });
    }

    // Remove from all spouse records
    for (const sp of member.spouses) {
      await FamilyMember.findByIdAndUpdate(sp.memberId, {
        $pull: { spouses: { memberId: member._id } },
      });
    }

    // Orphan children
    await FamilyMember.updateMany(
      { fatherId: member._id },
      { $unset: { fatherId: '' } }
    );
    await FamilyMember.updateMany(
      { motherId: member._id },
      { $unset: { motherId: '' } }
    );

    await FamilyTree.findByIdAndUpdate(req.params.treeId, {
      $pull: { members: member._id },
    });

    await FamilyMember.findByIdAndDelete(member._id);
    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ BRANCH (Create new tree from subtree) ============

router.post('/:treeId/branch', async (req, res) => {
  try {
    const tree = await FamilyTree.findOne({
      _id: req.params.treeId,
      owner: req.user._id,
    }).populate('members');
    if (!tree) {
      return res.status(404).json({ error: 'Family tree not found' });
    }

    const { rootMemberId } = req.body;
    const membersMap = {};
    tree.members.forEach((m) => (membersMap[m._id.toString()] = m));

    const rootMember = membersMap[rootMemberId];
    if (!rootMember) {
      return res.status(404).json({ error: 'Root member not found in tree' });
    }

    // Collect all descendants recursively
    const descendantIds = new Set();
    function collectDescendants(memberId) {
      if (descendantIds.has(memberId)) return;
      descendantIds.add(memberId);
      const m = membersMap[memberId];
      if (m && m.childrenIds) {
        m.childrenIds.forEach((cid) => {
          const childId = typeof cid === 'object' && cid._id ? cid._id.toString() : cid.toString();
          collectDescendants(childId);
        });
      }
    }
    collectDescendants(rootMemberId);

    // Also collect spouses of all descendants
    const spouseIds = new Set();
    descendantIds.forEach((did) => {
      const m = membersMap[did];
      if (m && m.spouses) {
        m.spouses.forEach((sp) => {
          const sid = typeof sp.memberId === 'object' && sp.memberId._id
            ? sp.memberId._id.toString()
            : sp.memberId.toString();
          if (!descendantIds.has(sid)) {
            spouseIds.add(sid);
          }
        });
      }
    });

    // All members to copy = descendants + their spouses
    const allIds = new Set([...descendantIds, ...spouseIds]);

    // Create new tree
    const rootName = `${rootMember.firstName} ${rootMember.lastName}'s Family`;
    const newTree = await FamilyTree.create({
      name: rootName,
      description: `Branched from ${tree.name}`,
      owner: req.user._id,
    });
    req.user.familyTrees.push(newTree._id);
    await req.user.save();

    // Map old IDs → new IDs
    const idMap = {};

    // Create all new members (without relationships first)
    for (const oldId of allIds) {
      const src = membersMap[oldId];
      if (!src) continue;
      const newMember = await FamilyMember.create({
        firstName: src.firstName,
        lastName: src.lastName,
        gender: src.gender,
        birthDate: src.birthDate,
        deathDate: src.deathDate,
        isLiving: src.isLiving,
        birthPlace: src.birthPlace,
        occupation: src.occupation,
        email: src.email,
        phone: src.phone,
        bio: src.bio,
        familyTree: newTree._id,
      });
      idMap[oldId] = newMember._id.toString();
      newTree.members.push(newMember._id);
    }
    newTree.rootMember = idMap[rootMemberId];
    await newTree.save();

    // Wire up relationships using idMap
    for (const oldId of allIds) {
      const src = membersMap[oldId];
      if (!src) continue;
      const newId = idMap[oldId];
      const update = {};

      // Father — only if the father is also copied
      if (src.fatherId) {
        const fid = typeof src.fatherId === 'object' && src.fatherId._id
          ? src.fatherId._id.toString() : src.fatherId.toString();
        if (idMap[fid]) update.fatherId = idMap[fid];
      }
      // Mother
      if (src.motherId) {
        const mid = typeof src.motherId === 'object' && src.motherId._id
          ? src.motherId._id.toString() : src.motherId.toString();
        if (idMap[mid]) update.motherId = idMap[mid];
      }
      // Children
      const newChildren = [];
      if (src.childrenIds) {
        src.childrenIds.forEach((cid) => {
          const cstr = typeof cid === 'object' && cid._id ? cid._id.toString() : cid.toString();
          if (idMap[cstr]) newChildren.push(idMap[cstr]);
        });
      }
      if (newChildren.length > 0) update.childrenIds = newChildren;

      // Spouses
      const newSpouses = [];
      if (src.spouses) {
        src.spouses.forEach((sp) => {
          const sid = typeof sp.memberId === 'object' && sp.memberId._id
            ? sp.memberId._id.toString() : sp.memberId.toString();
          if (idMap[sid]) {
            newSpouses.push({ memberId: idMap[sid], status: sp.status });
          }
        });
      }
      if (newSpouses.length > 0) update.spouses = newSpouses;

      if (Object.keys(update).length > 0) {
        await FamilyMember.findByIdAndUpdate(newId, { $set: update });
      }
    }

    // Return the new tree populated
    const populated = await FamilyTree.findById(newTree._id).populate('members');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ EXPORT TO EXCEL ============

router.get('/:treeId/export', async (req, res) => {
  try {
    const tree = await FamilyTree.findOne({
      _id: req.params.treeId,
      owner: req.user._id,
    }).populate({
      path: 'members',
      populate: [
        { path: 'fatherId', select: 'firstName lastName' },
        { path: 'motherId', select: 'firstName lastName' },
        { path: 'spouses.memberId', select: 'firstName lastName' },
        { path: 'childrenIds', select: 'firstName lastName' },
      ],
    });

    if (!tree) {
      return res.status(404).json({ error: 'Family tree not found' });
    }

    const resolveId = (ref) => {
      if (!ref) return '';
      if (typeof ref === 'object' && ref._id) return ref._id.toString();
      return ref.toString();
    };

    const resolveName = (ref) => {
      if (!ref) return '';
      if (typeof ref === 'object' && (ref.firstName || ref.lastName)) {
        const parts = [ref.lastName, ref.middleName, ref.vnName, ref.firstName].filter(Boolean);
        return parts.join(' ');
      }
      return '';
    };

    const rows = (tree.members || []).map((m) => {
      const spouseEntries = (m.spouses || []).map((sp) => {
        const id = resolveId(sp.memberId);
        return id ? `${id} (${sp.status || 'married'})` : '';
      }).filter(Boolean).join('; ');

      const childIds = (m.childrenIds || []).map((c) => resolveId(c)).filter(Boolean).join('; ');

      return {
        _id: m._id.toString(),
        saintName: m.saintName || '',
        lastName: m.lastName || '',
        middleName: m.middleName || '',
        vnName: m.vnName || '',
        firstName: m.firstName || '',
        gender: m.gender || '',
        birthDate: m.birthDate ? new Date(m.birthDate).toISOString().split('T')[0] : '',
        deathDate: m.deathDate ? new Date(m.deathDate).toISOString().split('T')[0] : '',
        isLiving: m.isLiving ? 'Yes' : 'No',
        birthPlace: m.birthPlace || '',
        occupation: m.occupation || '',
        email: m.email || '',
        phone: m.phone || '',
        bio: m.bio || '',
        photo: m.photo ? 'Yes' : 'No',
        fatherId: resolveId(m.fatherId),
        fatherName: resolveName(m.fatherId),
        motherId: resolveId(m.motherId),
        motherName: resolveName(m.motherId),
        spouses: spouseEntries,
        children: childIds,
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows, {
      header: [
        '_id', 'saintName', 'lastName', 'middleName', 'vnName', 'firstName', 'gender',
        'birthDate', 'deathDate', 'isLiving',
        'birthPlace', 'occupation', 'email', 'phone', 'bio', 'photo',
        'fatherId', 'fatherName', 'motherId', 'motherName',
        'spouses', 'children',
      ],
    });

    // Set column widths for readability
    ws['!cols'] = [
      { wch: 26 }, // _id
      { wch: 12 }, // saintName
      { wch: 14 }, // lastName
      { wch: 12 }, // middleName
      { wch: 12 }, // vnName
      { wch: 14 }, // firstName
      { wch: 8 },  // gender
      { wch: 12 }, // birthDate
      { wch: 12 }, // deathDate
      { wch: 8 },  // isLiving
      { wch: 20 }, // birthPlace
      { wch: 20 }, // occupation
      { wch: 24 }, // email
      { wch: 14 }, // phone
      { wch: 40 }, // bio
      { wch: 6 },  // photo (Yes/No)
      { wch: 26 }, // fatherId
      { wch: 20 }, // fatherName
      { wch: 26 }, // motherId
      { wch: 20 }, // motherName
      { wch: 36 }, // spouses
      { wch: 36 }, // children
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Members');

    // Add an instructions sheet for batch import
    const instrRows = [
      { Instructions: 'HOW TO ADD NEW MEMBERS IN BATCH' },
      { Instructions: '' },
      { Instructions: '1. Add new rows at the bottom of the "Members" sheet' },
      { Instructions: '2. Leave the _id column EMPTY for new members' },
      { Instructions: '3. Fill in firstName, lastName, gender (male/female/other)' },
      { Instructions: '4. Dates use YYYY-MM-DD format (e.g. 1990-05-15)' },
      { Instructions: '5. isLiving: "Yes" or "No"' },
      { Instructions: '6. For fatherId / motherId: paste the _id of the parent member (the 24-char hex string)' },
      { Instructions: '7. fatherName / motherName columns are READ-ONLY (for reference only, ignored on import)' },
      { Instructions: '8. For spouses: "_id (married)" or "_id (divorced)" — use the spouse\'s _id' },
      { Instructions: '9. Separate multiple spouses with semicolons (;)' },
      { Instructions: '10. The "children" column is READ-ONLY (computed from parent references)' },
      { Instructions: '' },
      { Instructions: 'NOTES:' },
      { Instructions: '- All relationship links use _id to avoid ambiguity with duplicate names' },
      { Instructions: '- Existing members (with _id) will be updated if you change their data' },
      { Instructions: '- New members (empty _id) will be created' },
    ];
    const instrWs = XLSX.utils.json_to_sheet(instrRows);
    instrWs['!cols'] = [{ wch: 70 }];
    XLSX.utils.book_append_sheet(wb, instrWs, 'Instructions');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const safeName = (tree.name || 'family-tree').replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}_members.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:treeId/members/:memberId/position', async (req, res) => {
  try {
    const { x, y } = req.body;
    const member = await FamilyMember.findOneAndUpdate(
      { _id: req.params.memberId, familyTree: req.params.treeId },
      { $set: { position: { x, y } } },
      { new: true }
    );
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.json(member);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ IMPORT FROM EXCEL/CSV/NUMBERS ============

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.post('/:treeId/import', upload.single('file'), async (req, res) => {
  try {
    const tree = await FamilyTree.findOne({
      _id: req.params.treeId,
      owner: req.user._id,
    });
    if (!tree) {
      return res.status(404).json({ error: 'Family tree not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileName = req.file.originalname.toLowerCase();
    let workbook;

    // Parse the file based on format
    // XLSX library can handle: .xlsx, .xls, .csv, and even .numbers (with limitations)
    try {
      workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    } catch (parseErr) {
      return res.status(400).json({
        error: `Could not parse file. Supported formats: .xlsx, .xls, .csv, .numbers. Error: ${parseErr.message}`
      });
    }

    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return res.status(400).json({ error: 'No sheets found in file' });
    }

    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (rows.length === 0) {
      return res.status(400).json({ error: 'No data rows found in file' });
    }

    const created = [];
    const updated = [];
    const errors = [];

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // Excel row number (1-indexed + header)

      try {
        // Skip rows without lastName
        const lastName = (row.lastName || row['Last Name'] || row['Họ'] || '').toString().trim();
        if (!lastName) {
          errors.push(`Row ${rowNum}: Missing lastName, skipped`);
          continue;
        }

        // Extract fields (support multiple column name formats)
        const firstName = (row.firstName || row['First Name'] || row['Tên'] || '').toString().trim();
        const vnName = (row.vnName || row['Vietnamese Name'] || row['Tên Việt'] || '').toString().trim();

        // Require either firstName or vnName
        if (!firstName && !vnName) {
          errors.push(`Row ${rowNum}: Missing both firstName and vnName, skipped`);
          continue;
        }

        const memberData = {
          saintName: (row.saintName || row['Saint Name'] || row['Tên Thánh'] || '').toString().trim(),
          lastName,
          middleName: (row.middleName || row['Middle Name'] || row['Tên đệm'] || '').toString().trim(),
          vnName,
          firstName,
          gender: (row.gender || row['Gender'] || row['Giới tính'] || 'other').toString().toLowerCase().trim(),
          birthPlace: (row.birthPlace || row['Birthplace'] || row['Nơi sinh'] || '').toString().trim(),
          occupation: (row.occupation || row['Occupation'] || row['Nghề nghiệp'] || '').toString().trim(),
          email: (row.email || row['Email'] || '').toString().trim(),
          phone: (row.phone || row['Phone'] || row['Điện thoại'] || '').toString().trim(),
          bio: (row.bio || row['Biography'] || row['Tiểu sử'] || '').toString().trim(),
          familyTree: tree._id,
        };

        // Handle gender normalization
        if (['nam', 'male', 'm'].includes(memberData.gender)) {
          memberData.gender = 'male';
        } else if (['nữ', 'nu', 'female', 'f'].includes(memberData.gender)) {
          memberData.gender = 'female';
        } else {
          memberData.gender = 'other';
        }

        // Handle isLiving
        const isLivingStr = (row.isLiving || row['Is Living'] || row['Còn sống'] || 'yes').toString().toLowerCase().trim();
        memberData.isLiving = ['yes', 'true', '1', 'còn sống', 'có'].includes(isLivingStr);

        // Handle dates
        const birthDate = row.birthDate || row['Birth Date'] || row['Ngày sinh'];
        if (birthDate) {
          const parsed = parseDate(birthDate);
          if (parsed) memberData.birthDate = parsed;
        }

        const deathDate = row.deathDate || row['Death Date'] || row['Ngày mất'];
        if (deathDate) {
          const parsed = parseDate(deathDate);
          if (parsed) memberData.deathDate = parsed;
        }

        // Check if this is an update (has _id) or new member
        const existingId = (row._id || row['ID'] || '').toString().trim();

        if (existingId && existingId.match(/^[0-9a-fA-F]{24}$/)) {
          // Update existing member
          const existingMember = await FamilyMember.findOne({
            _id: existingId,
            familyTree: tree._id,
          });

          if (existingMember) {
            await FamilyMember.findByIdAndUpdate(existingId, { $set: memberData });
            updated.push(existingId);
          } else {
            errors.push(`Row ${rowNum}: Member with ID ${existingId} not found, skipped`);
          }
        } else {
          // Create new member
          const newMember = await FamilyMember.create(memberData);
          tree.members.push(newMember._id);
          created.push(newMember._id.toString());
        }
      } catch (rowErr) {
        errors.push(`Row ${rowNum}: ${rowErr.message}`);
      }
    }

    // Save tree if new members were added
    if (created.length > 0) {
      await tree.save();
    }

    // Second pass: link parent relationships
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        const memberId = (row._id || '').toString().trim();
        if (!memberId || !memberId.match(/^[0-9a-fA-F]{24}$/)) continue;

        const fatherId = (row.fatherId || row['Father ID'] || '').toString().trim();
        const motherId = (row.motherId || row['Mother ID'] || '').toString().trim();

        const updates = {};
        if (fatherId && fatherId.match(/^[0-9a-fA-F]{24}$/)) {
          updates.fatherId = fatherId;
        }
        if (motherId && motherId.match(/^[0-9a-fA-F]{24}$/)) {
          updates.motherId = motherId;
        }

        if (Object.keys(updates).length > 0) {
          await FamilyMember.findByIdAndUpdate(memberId, { $set: updates });
        }
      } catch (linkErr) {
        errors.push(`Row ${rowNum} (linking): ${linkErr.message}`);
      }
    }

    res.json({
      created: created.length,
      updated: updated.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper function to parse dates from various formats
function parseDate(value) {
  if (!value) return null;

  // If it's already a Date object
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  // If it's an Excel serial date number
  if (typeof value === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    return isNaN(date.getTime()) ? null : date;
  }

  // If it's a string
  const str = value.toString().trim();
  if (!str) return null;

  // Try ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const date = new Date(str);
    return isNaN(date.getTime()) ? null : date;
  }

  // Try DD/MM/YYYY format
  const ddmmyyyy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return isNaN(date.getTime()) ? null : date;
  }

  // Try MM/DD/YYYY format (US)
  const mmddyyyy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyy) {
    const [, month, day, year] = mmddyyyy;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return isNaN(date.getTime()) ? null : date;
  }

  // Try general Date parsing
  const date = new Date(str);
  return isNaN(date.getTime()) ? null : date;
}

module.exports = router;

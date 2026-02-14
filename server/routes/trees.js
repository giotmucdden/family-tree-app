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
    const trees = await FamilyTree.find({ owner: req.user._id }).populate(
      'members'
    );
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
    const tree = await FamilyTree.findOne({
      _id: req.params.treeId,
      owner: req.user._id,
    }).populate({
      path: 'members',
      populate: [
        { path: 'fatherId', select: 'firstName lastName gender' },
        { path: 'motherId', select: 'firstName lastName gender' },
        { path: 'spouses.memberId', select: 'firstName lastName gender' },
        { path: 'childrenIds', select: 'firstName lastName gender' },
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
    const tree = await FamilyTree.findOne({
      _id: req.params.treeId,
      owner: req.user._id,
    });
    if (!tree) {
      return res.status(404).json({ error: 'Family tree not found' });
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
      .populate('fatherId', 'firstName lastName gender')
      .populate('motherId', 'firstName lastName gender')
      .populate('spouses.memberId', 'firstName lastName gender')
      .populate('childrenIds', 'firstName lastName gender');

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:treeId/members/:memberId', async (req, res) => {
  try {
    const member = await FamilyMember.findOneAndUpdate(
      { _id: req.params.memberId, familyTree: req.params.treeId },
      { $set: req.body },
      { new: true }
    )
      .populate('fatherId', 'firstName lastName gender')
      .populate('motherId', 'firstName lastName gender')
      .populate('spouses.memberId', 'firstName lastName gender')
      .populate('childrenIds', 'firstName lastName gender');

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
    const member = await FamilyMember.findOne({
      _id: req.params.memberId,
      familyTree: req.params.treeId,
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
      if (typeof ref === 'object' && ref.firstName) return `${ref.firstName} ${ref.lastName}`;
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
        firstName: m.firstName || '',
        lastName: m.lastName || '',
        gender: m.gender || '',
        birthDate: m.birthDate ? new Date(m.birthDate).toISOString().split('T')[0] : '',
        deathDate: m.deathDate ? new Date(m.deathDate).toISOString().split('T')[0] : '',
        isLiving: m.isLiving ? 'Yes' : 'No',
        birthPlace: m.birthPlace || '',
        occupation: m.occupation || '',
        email: m.email || '',
        phone: m.phone || '',
        bio: m.bio || '',
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
        '_id', 'firstName', 'lastName', 'gender',
        'birthDate', 'deathDate', 'isLiving',
        'birthPlace', 'occupation', 'email', 'phone', 'bio',
        'fatherId', 'fatherName', 'motherId', 'motherName',
        'spouses', 'children',
      ],
    });

    // Set column widths for readability
    ws['!cols'] = [
      { wch: 26 }, // _id
      { wch: 14 }, // firstName
      { wch: 14 }, // lastName
      { wch: 8 },  // gender
      { wch: 12 }, // birthDate
      { wch: 12 }, // deathDate
      { wch: 8 },  // isLiving
      { wch: 20 }, // birthPlace
      { wch: 20 }, // occupation
      { wch: 24 }, // email
      { wch: 14 }, // phone
      { wch: 40 }, // bio
      { wch: 26 }, // fatherId
      { wch: 20 }, // fatherName (read-only, for reference)
      { wch: 26 }, // motherId
      { wch: 20 }, // motherName (read-only, for reference)
      { wch: 36 }, // spouses (_id + status)
      { wch: 36 }, // children (_ids)
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

module.exports = router;

import React, { useMemo } from 'react';

function RelationshipPopup({ member1, member2, allMembers }) {
  // Helper to format member name
  const formatMemberName = (m) => {
    if (!m) return '';
    const parts = [m.lastName, m.middleName, m.vnName, m.firstName].filter(Boolean);
    return parts.join(' ');
  };

  // Helper to calculate age
  const calculateAge = (birthDate, deathDate, isLiving) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const end = isLiving ? new Date() : (deathDate ? new Date(deathDate) : new Date());
    let age = end.getFullYear() - birth.getFullYear();
    const m = end.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && end.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Build ancestor path from member to root
  const getAncestorPath = (memberId, visited = new Set()) => {
    if (visited.has(memberId)) return [];
    visited.add(memberId);

    const member = allMembers.find(m => m._id === memberId);
    if (!member) return [];

    const path = [memberId];
    const fatherId = typeof member.fatherId === 'object' ? member.fatherId?._id : member.fatherId;
    const motherId = typeof member.motherId === 'object' ? member.motherId?._id : member.motherId;

    if (fatherId) {
      const fatherPath = getAncestorPath(fatherId, visited);
      if (fatherPath.length > 0) {
        return [...path, ...fatherPath];
      }
    }
    if (motherId) {
      const motherPath = getAncestorPath(motherId, visited);
      if (motherPath.length > 0) {
        return [...path, ...motherPath];
      }
    }
    return path;
  };

  // Find relationship between two members
  const relationship = useMemo(() => {
    if (!member1 || !member2 || member1._id === member2._id) {
      return { type: 'same', description: 'Cùng một người' };
    }

    const id1 = member1._id;
    const id2 = member2._id;

    // Get parent IDs
    const getParentIds = (m) => {
      const fatherId = typeof m.fatherId === 'object' ? m.fatherId?._id : m.fatherId;
      const motherId = typeof m.motherId === 'object' ? m.motherId?._id : m.motherId;
      return { fatherId, motherId };
    };

    const parents1 = getParentIds(member1);
    const parents2 = getParentIds(member2);

    // Check if spouses
    const isSpouse = (m1, m2) => {
      if (!m1.spouses) return false;
      return m1.spouses.some(sp => {
        const spouseId = typeof sp.memberId === 'object' ? sp.memberId?._id : sp.memberId;
        return spouseId === m2._id;
      });
    };

    if (isSpouse(member1, member2) || isSpouse(member2, member1)) {
      return { type: 'spouse', description: 'Vợ/Chồng', icon: '💑' };
    }

    // Check parent-child relationship
    if (parents2.fatherId === id1 || parents2.motherId === id1) {
      return { type: 'parent', description: member1.gender === 'male' ? 'Cha - Con' : 'Mẹ - Con', icon: '👨‍👧' };
    }
    if (parents1.fatherId === id2 || parents1.motherId === id2) {
      return { type: 'child', description: member2.gender === 'male' ? 'Con - Cha' : 'Con - Mẹ', icon: '👧‍👨' };
    }

    // Check siblings (same parents)
    const sameParents = (parents1.fatherId && parents1.fatherId === parents2.fatherId) ||
                        (parents1.motherId && parents1.motherId === parents2.motherId);
    if (sameParents) {
      return { type: 'sibling', description: 'Anh/Chị/Em ruột', icon: '👫' };
    }

    // Build ancestor paths to find common ancestor
    const path1 = getAncestorPath(id1);
    const path2 = getAncestorPath(id2);

    // Find common ancestor
    let commonAncestorId = null;
    let dist1 = -1;
    let dist2 = -1;

    for (let i = 0; i < path1.length; i++) {
      const idx2 = path2.indexOf(path1[i]);
      if (idx2 !== -1) {
        commonAncestorId = path1[i];
        dist1 = i;
        dist2 = idx2;
        break;
      }
    }

    if (commonAncestorId) {
      const commonAncestor = allMembers.find(m => m._id === commonAncestorId);
      const ancestorName = formatMemberName(commonAncestor);

      // Same generation from common ancestor
      if (dist1 === dist2) {
        if (dist1 === 1) {
          return { type: 'sibling', description: 'Anh/Chị/Em ruột', icon: '👫', ancestor: ancestorName };
        } else if (dist1 === 2) {
          return { type: 'cousin', description: 'Anh/Chị/Em họ (cùng ông/bà)', icon: '🤝', ancestor: ancestorName, generation: 1 };
        } else if (dist1 === 3) {
          return { type: 'cousin', description: 'Anh/Chị/Em họ (cùng cố/cụ)', icon: '🤝', ancestor: ancestorName, generation: 2 };
        } else {
          return { type: 'cousin', description: `Họ hàng cùng đời (${dist1 - 1} đời)`, icon: '🤝', ancestor: ancestorName, generation: dist1 - 1 };
        }
      }

      // Different generations
      const genDiff = Math.abs(dist1 - dist2);
      const olderPerson = dist1 < dist2 ? member1 : member2;

      if (genDiff === 1) {
        // Uncle/Aunt - Nephew/Niece
        const isOlderMale = olderPerson.gender === 'male';
        return {
          type: 'uncle-nephew',
          description: isOlderMale ? 'Chú/Bác - Cháu' : 'Cô/Dì - Cháu',
          icon: '👨‍👦',
          ancestor: ancestorName
        };
      } else if (genDiff === 2) {
        return {
          type: 'granduncle-grandnephew',
          description: 'Ông/Bà họ - Cháu họ',
          icon: '👴',
          ancestor: ancestorName
        };
      } else {
        return {
          type: 'distant',
          description: `Họ hàng cách ${genDiff} đời`,
          icon: '👥',
          ancestor: ancestorName,
          generationDiff: genDiff
        };
      }
    }

    // No common ancestor found
    return { type: 'unknown', description: 'Không xác định được mối quan hệ', icon: '❓' };
  }, [member1, member2, allMembers]);

  const age1 = calculateAge(member1?.birthDate, member1?.deathDate, member1?.isLiving);
  const age2 = calculateAge(member2?.birthDate, member2?.deathDate, member2?.isLiving);

  // Use the same slot-based layout as TreeView for consistency
  return (
    <>
      {/* Member 1 Slot */}
      <div className="relationship-slot filled">
        <div className="slot-photo">
          {member1?.photo ? (
            <img src={member1.photo} alt="" />
          ) : (
            <span>{member1?.gender === 'male' ? '👨' : member1?.gender === 'female' ? '👩' : '👤'}</span>
          )}
        </div>
        <div className="slot-info">
          <span className="slot-name">{formatMemberName(member1)}</span>
          <span className="slot-details">
            {member1?.gender === 'male' ? '♂ Nam' : member1?.gender === 'female' ? '♀ Nữ' : '⚬'}
            {age1 !== null && ` • ${age1} tuổi`}
          </span>
        </div>
      </div>

      {/* Relationship Result in Divider */}
      <div className="relationship-slot-result">
        <span className="result-icon">{relationship.icon || '🔗'}</span>
        <span className="result-type">{relationship.description}</span>
        {relationship.ancestor && (
          <span className="result-ancestor">({relationship.ancestor})</span>
        )}
      </div>

      {/* Member 2 Slot */}
      <div className="relationship-slot filled">
        <div className="slot-photo">
          {member2?.photo ? (
            <img src={member2.photo} alt="" />
          ) : (
            <span>{member2?.gender === 'male' ? '👨' : member2?.gender === 'female' ? '👩' : '👤'}</span>
          )}
        </div>
        <div className="slot-info">
          <span className="slot-name">{formatMemberName(member2)}</span>
          <span className="slot-details">
            {member2?.gender === 'male' ? '♂ Nam' : member2?.gender === 'female' ? '♀ Nữ' : '⚬'}
            {age2 !== null && ` • ${age2} tuổi`}
          </span>
        </div>
      </div>
    </>
  );
}

export default RelationshipPopup;

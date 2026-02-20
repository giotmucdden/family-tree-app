import React, { useMemo, useState } from 'react';

/**
 * Vietnamese Kinship Relationship Calculator
 * Uses Relationship Matrix + Generation Difference algorithm
 * 
 * Key concepts:
 * - Level (Thế hệ): Generation level from root
 * - isBloodline: True if blood relative, False if in-law (dâu/rể)
 * - birthOrder: Birth order among siblings (1 = eldest)
 * - Branch seniority: Based on ancestor's birth order, not age
 */

function RelationshipPopup({ member1, member2, allMembers, dialect = 'bac' }) {
  const [selectedDialect, setSelectedDialect] = useState(dialect);

  // Regional dialect mappings
  const dialectMap = {
    bac: { // Northern Vietnam
      father: 'Bố', mother: 'Mẹ',
      grandfather_paternal: 'Ông nội', grandmother_paternal: 'Bà nội',
      grandfather_maternal: 'Ông ngoại', grandmother_maternal: 'Bà ngoại',
      great_grandfather: 'Cụ ông', great_grandmother: 'Cụ bà',
      uncle_older: 'Bác', uncle_younger: 'Chú', uncle_maternal: 'Cậu',
      aunt_paternal: 'Cô', aunt_maternal: 'Dì',
      aunt_older: 'Bác gái',
      uncle_wife_older: 'Bác gái', uncle_wife_younger: 'Thím', uncle_wife_maternal: 'Mợ',
      aunt_husband_paternal: 'Chú', aunt_husband_maternal: 'Dượng',
      older_brother: 'Anh', older_sister: 'Chị',
      younger_sibling: 'Em',
      nephew_niece: 'Cháu',
      son: 'Con trai', daughter: 'Con gái',
      grandson: 'Cháu trai', granddaughter: 'Cháu gái',
      husband: 'Chồng', wife: 'Vợ',
      son_in_law: 'Con rể', daughter_in_law: 'Con dâu',
      brother_in_law_older: 'Anh rể', brother_in_law_younger: 'Em rể',
      sister_in_law_older: 'Chị dâu', sister_in_law_younger: 'Em dâu',
      cousin_older_male: 'Anh họ', cousin_older_female: 'Chị họ',
      cousin_younger: 'Em họ',
    },
    trung: { // Central Vietnam
      father: 'Ba', mother: 'Mạ',
      grandfather_paternal: 'Ông nội', grandmother_paternal: 'Bà nội',
      grandfather_maternal: 'Ông ngoại', grandmother_maternal: 'Bà ngoại',
      great_grandfather: 'Cố ông', great_grandmother: 'Cố bà',
      uncle_older: 'Bác', uncle_younger: 'Chú', uncle_maternal: 'Cậu',
      aunt_paternal: 'O', aunt_maternal: 'Dì',
      aunt_older: 'Bác gái',
      uncle_wife_older: 'Bác gái', uncle_wife_younger: 'Thím', uncle_wife_maternal: 'Mợ',
      aunt_husband_paternal: 'Dượng', aunt_husband_maternal: 'Dượng',
      older_brother: 'Anh', older_sister: 'Chị',
      younger_sibling: 'Em',
      nephew_niece: 'Cháu',
      son: 'Con trai', daughter: 'Con gái',
      grandson: 'Cháu trai', granddaughter: 'Cháu gái',
      husband: 'Chồng', wife: 'Vợ',
      son_in_law: 'Con rể', daughter_in_law: 'Con dâu',
      brother_in_law_older: 'Anh rể', brother_in_law_younger: 'Em rể',
      sister_in_law_older: 'Chị dâu', sister_in_law_younger: 'Em dâu',
      cousin_older_male: 'Anh họ', cousin_older_female: 'Chị họ',
      cousin_younger: 'Em họ',
    },
    nam: { // Southern Vietnam
      father: 'Ba', mother: 'Má',
      grandfather_paternal: 'Ông nội', grandmother_paternal: 'Bà nội',
      grandfather_maternal: 'Ông ngoại', grandmother_maternal: 'Bà ngoại',
      great_grandfather: 'Ông cố', great_grandmother: 'Bà cố',
      uncle_older: 'Bác', uncle_younger: 'Chú', uncle_maternal: 'Cậu',
      aunt_paternal: 'Cô', aunt_maternal: 'Dì',
      aunt_older: 'Bác gái',
      uncle_wife_older: 'Bác gái', uncle_wife_younger: 'Thím', uncle_wife_maternal: 'Mợ',
      aunt_husband_paternal: 'Dượng', aunt_husband_maternal: 'Dượng',
      older_brother: 'Anh', older_sister: 'Chị',
      younger_sibling: 'Em',
      nephew_niece: 'Cháu',
      son: 'Con trai', daughter: 'Con gái',
      grandson: 'Cháu trai', granddaughter: 'Cháu gái',
      husband: 'Chồng', wife: 'Vợ',
      son_in_law: 'Con rể', daughter_in_law: 'Con dâu',
      brother_in_law_older: 'Anh rể', brother_in_law_younger: 'Em rể',
      sister_in_law_older: 'Chị dâu', sister_in_law_younger: 'Em dâu',
      cousin_older_male: 'Anh họ', cousin_older_female: 'Chị họ',
      cousin_younger: 'Em họ',
    }
  };

  const terms = dialectMap[selectedDialect] || dialectMap.bac;

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

  // Get normalized parent IDs
  const getParentIds = (member) => {
    if (!member) return { fatherId: null, motherId: null };
    const fatherId = typeof member.fatherId === 'object' ? member.fatherId?._id : member.fatherId;
    const motherId = typeof member.motherId === 'object' ? member.motherId?._id : member.motherId;
    return { fatherId, motherId };
  };

  // Check if member is in-law (dâu/rể) - has no parents but has spouse with parents
  const isInLaw = (member) => {
    if (!member) return false;
    const { fatherId, motherId } = getParentIds(member);
    if (fatherId || motherId) return false; // Has parents, is bloodline
    
    // Check if married to someone with parents
    if (member.spouses && member.spouses.length > 0) {
      for (const sp of member.spouses) {
        const spouseId = typeof sp.memberId === 'object' ? sp.memberId?._id : sp.memberId;
        const spouse = allMembers.find(m => m._id === spouseId);
        if (spouse) {
          const spouseParents = getParentIds(spouse);
          if (spouseParents.fatherId || spouseParents.motherId) {
            return true;
          }
        }
      }
    }
    return false;
  };

  // Get spouse of a member
  const getSpouse = (member) => {
    if (!member?.spouses || member.spouses.length === 0) return null;
    const marriedSpouse = member.spouses.find(sp => sp.status === 'married');
    const spouseEntry = marriedSpouse || member.spouses[0];
    const spouseId = typeof spouseEntry.memberId === 'object' ? spouseEntry.memberId?._id : spouseEntry.memberId;
    return allMembers.find(m => m._id === spouseId);
  };

  // Check if two members are spouses
  const areSpouses = (m1, m2) => {
    if (!m1?.spouses) return false;
    return m1.spouses.some(sp => {
      const spouseId = typeof sp.memberId === 'object' ? sp.memberId?._id : sp.memberId;
      return spouseId === m2._id;
    });
  };

  // Calculate generation levels for all members (BFS from roots)
  const memberLevels = useMemo(() => {
    const levels = {};
    const visited = new Set();
    
    // Find root members (no parents)
    const roots = allMembers.filter(m => {
      const { fatherId, motherId } = getParentIds(m);
      return !fatherId && !motherId;
    });

    // BFS to assign levels
    const queue = roots.map(r => ({ member: r, level: 0 }));
    
    while (queue.length > 0) {
      const { member, level } = queue.shift();
      if (visited.has(member._id)) continue;
      visited.add(member._id);
      levels[member._id] = level;

      // Find children
      const children = allMembers.filter(m => {
        const { fatherId, motherId } = getParentIds(m);
        return fatherId === member._id || motherId === member._id;
      });

      for (const child of children) {
        if (!visited.has(child._id)) {
          queue.push({ member: child, level: level + 1 });
        }
      }

      // Assign same level to spouse
      const spouse = getSpouse(member);
      if (spouse && !visited.has(spouse._id)) {
        queue.push({ member: spouse, level: level });
      }
    }

    return levels;
  }, [allMembers]);

  // Get birth order among siblings
  const getBirthOrder = (member) => {
    if (!member) return 999;
    if (member.birthOrder) return member.birthOrder;
    
    const { fatherId, motherId } = getParentIds(member);
    if (!fatherId && !motherId) return 1;

    // Find siblings
    const siblings = allMembers.filter(m => {
      const p = getParentIds(m);
      return (fatherId && p.fatherId === fatherId) || (motherId && p.motherId === motherId);
    });

    // Sort by birth date or name
    siblings.sort((a, b) => {
      if (a.birthDate && b.birthDate) {
        return new Date(a.birthDate) - new Date(b.birthDate);
      }
      return (a.firstName || '').localeCompare(b.firstName || '');
    });

    const index = siblings.findIndex(s => s._id === member._id);
    return index >= 0 ? index + 1 : 999;
  };

  // Build path to root with branch info
  const getPathToRoot = (memberId, visited = new Set()) => {
    if (visited.has(memberId)) return [];
    visited.add(memberId);

    const member = allMembers.find(m => m._id === memberId);
    if (!member) return [];

    const { fatherId, motherId } = getParentIds(member);
    const birthOrder = getBirthOrder(member);
    
    const node = {
      id: memberId,
      member,
      birthOrder,
      isBloodline: !isInLaw(member),
      level: memberLevels[memberId] || 0
    };

    // Prefer paternal line for bloodline tracing
    if (fatherId) {
      const fatherPath = getPathToRoot(fatherId, visited);
      return [node, ...fatherPath];
    }
    if (motherId) {
      const motherPath = getPathToRoot(motherId, visited);
      return [node, ...motherPath];
    }

    return [node];
  };

  // Find LCA (Lowest Common Ancestor) and paths
  const findLCAAndPaths = (id1, id2) => {
    const path1 = getPathToRoot(id1);
    const path2 = getPathToRoot(id2);

    // Find common ancestor
    for (let i = 0; i < path1.length; i++) {
      for (let j = 0; j < path2.length; j++) {
        if (path1[i].id === path2[j].id) {
          return {
            lca: path1[i],
            path1: path1.slice(0, i + 1),
            path2: path2.slice(0, j + 1),
            dist1: i,
            dist2: j
          };
        }
      }
    }

    return { lca: null, path1, path2, dist1: -1, dist2: -1 };
  };

  // Determine if target is in older branch relative to viewer
  const isOlderBranch = (targetPath, viewerPath, lca) => {
    if (!lca || targetPath.length < 2 || viewerPath.length < 2) return false;

    // Find the children of LCA in each path
    const targetChildOfLCA = targetPath[targetPath.length - 2];
    const viewerChildOfLCA = viewerPath[viewerPath.length - 2];

    if (!targetChildOfLCA || !viewerChildOfLCA) return false;
    if (targetChildOfLCA.id === viewerChildOfLCA.id) {
      // Same branch - compare next level
      if (targetPath.length >= 3 && viewerPath.length >= 3) {
        return targetPath[targetPath.length - 3].birthOrder < viewerPath[viewerPath.length - 3].birthOrder;
      }
      return false;
    }

    // Different branches - compare birth order of LCA's children
    return targetChildOfLCA.birthOrder < viewerChildOfLCA.birthOrder;
  };

  // Check if on paternal or maternal side
  const isPaternalSide = (path, lca) => {
    if (!lca || path.length < 2) return true;
    const childOfLCA = path[path.length - 2];
    return childOfLCA?.member?.gender === 'male';
  };

  // Main relationship calculation
  const relationship = useMemo(() => {
    if (!member1 || !member2) {
      return { title1to2: '', title2to1: '', description: '', icon: '❓' };
    }

    if (member1._id === member2._id) {
      return { title1to2: 'Chính mình', title2to1: 'Chính mình', description: 'Cùng một người', icon: '🪞' };
    }

    const id1 = member1._id;
    const id2 = member2._id;
    const level1 = memberLevels[id1] || 0;
    const level2 = memberLevels[id2] || 0;
    const deltaLevel = level1 - level2; // Positive = member1 is younger generation

    // Check spouse relationship
    if (areSpouses(member1, member2) || areSpouses(member2, member1)) {
      const title1 = member1.gender === 'male' ? terms.husband : terms.wife;
      const title2 = member2.gender === 'male' ? terms.husband : terms.wife;
      return {
        title1to2: title2, // What member1 calls member2
        title2to1: title1, // What member2 calls member1
        description: 'Vợ chồng',
        icon: '💑'
      };
    }

    // Get parent relationships
    const parents1 = getParentIds(member1);
    const parents2 = getParentIds(member2);

    // Direct parent-child
    if (parents1.fatherId === id2 || parents1.motherId === id2) {
      // member2 is parent of member1
      const title = member2.gender === 'male' ? terms.father : terms.mother;
      const childTitle = member1.gender === 'male' ? terms.son : terms.daughter;
      return {
        title1to2: title,
        title2to1: childTitle,
        description: `${title} - ${childTitle}`,
        icon: member2.gender === 'male' ? '👨' : '👩'
      };
    }

    if (parents2.fatherId === id1 || parents2.motherId === id1) {
      // member1 is parent of member2
      const title = member1.gender === 'male' ? terms.father : terms.mother;
      const childTitle = member2.gender === 'male' ? terms.son : terms.daughter;
      return {
        title1to2: childTitle,
        title2to1: title,
        description: `${title} - ${childTitle}`,
        icon: member1.gender === 'male' ? '👨' : '👩'
      };
    }

    // Find LCA for extended relationships
    const { lca, path1, path2, dist1, dist2 } = findLCAAndPaths(id1, id2);

    if (!lca) {
      // Check in-law relationships through spouse
      const spouse1 = getSpouse(member1);
      const spouse2 = getSpouse(member2);
      
      if (spouse1) {
        const spouseResult = findLCAAndPaths(spouse1._id, id2);
        if (spouseResult.lca) {
          // member1 is in-law, calculate based on spouse
          return calculateInLawRelationship(member1, member2, spouse1, spouseResult, terms);
        }
      }
      
      if (spouse2) {
        const spouseResult = findLCAAndPaths(id1, spouse2._id);
        if (spouseResult.lca) {
          // member2 is in-law
          return calculateInLawRelationship(member2, member1, spouse2, spouseResult, terms, true);
        }
      }

      return {
        title1to2: 'Không xác định',
        title2to1: 'Không xác định',
        description: 'Không tìm thấy mối quan hệ',
        icon: '❓'
      };
    }

    const ancestorName = formatMemberName(lca.member);
    const olderBranch1 = isOlderBranch(path1, path2, lca);
    const olderBranch2 = isOlderBranch(path2, path1, lca);
    const paternal = isPaternalSide(path1, lca) && isPaternalSide(path2, lca);

    // Same generation (siblings/cousins)
    if (dist1 === dist2) {
      if (dist1 === 1) {
        // Direct siblings
        if (olderBranch1) {
          const title1 = member1.gender === 'male' ? terms.older_brother : terms.older_sister;
          return {
            title1to2: terms.younger_sibling,
            title2to1: title1,
            description: 'Anh chị em ruột',
            icon: '👫',
            ancestor: ancestorName
          };
        } else {
          const title2 = member2.gender === 'male' ? terms.older_brother : terms.older_sister;
          return {
            title1to2: title2,
            title2to1: terms.younger_sibling,
            description: 'Anh chị em ruột',
            icon: '👫',
            ancestor: ancestorName
          };
        }
      } else {
        // Cousins
        let title1to2, title2to1;
        if (olderBranch2) {
          title1to2 = member2.gender === 'male' ? terms.cousin_older_male : terms.cousin_older_female;
          title2to1 = terms.cousin_younger;
        } else if (olderBranch1) {
          title1to2 = terms.cousin_younger;
          title2to1 = member1.gender === 'male' ? terms.cousin_older_male : terms.cousin_older_female;
        } else {
          // Same branch level - use age or default
          title1to2 = member2.gender === 'male' ? terms.cousin_older_male : terms.cousin_older_female;
          title2to1 = member1.gender === 'male' ? terms.cousin_older_male : terms.cousin_older_female;
        }

        const genText = dist1 === 2 ? 'cùng ông bà' : dist1 === 3 ? 'cùng cụ' : `cách ${dist1 - 1} đời`;
        return {
          title1to2,
          title2to1,
          description: `Anh chị em họ (${genText})`,
          icon: '🤝',
          ancestor: ancestorName
        };
      }
    }

    // Different generations
    const genDiff = Math.abs(dist1 - dist2);
    const member1IsYounger = dist1 > dist2;

    if (genDiff === 1) {
      // Uncle/Aunt - Nephew/Niece
      if (member1IsYounger) {
        // member2 is uncle/aunt of member1
        let uncleAuntTitle;
        if (member2.gender === 'male') {
          if (olderBranch2) {
            uncleAuntTitle = terms.uncle_older; // Bác
          } else {
            uncleAuntTitle = paternal ? terms.uncle_younger : terms.uncle_maternal; // Chú/Cậu
          }
        } else {
          if (olderBranch2) {
            uncleAuntTitle = terms.aunt_older; // Bác gái
          } else {
            uncleAuntTitle = paternal ? terms.aunt_paternal : terms.aunt_maternal; // Cô/Dì
          }
        }
        return {
          title1to2: uncleAuntTitle,
          title2to1: terms.nephew_niece,
          description: `${uncleAuntTitle} - ${terms.nephew_niece}`,
          icon: member2.gender === 'male' ? '👨' : '👩',
          ancestor: ancestorName
        };
      } else {
        // member1 is uncle/aunt of member2
        let uncleAuntTitle;
        if (member1.gender === 'male') {
          if (olderBranch1) {
            uncleAuntTitle = terms.uncle_older;
          } else {
            uncleAuntTitle = paternal ? terms.uncle_younger : terms.uncle_maternal;
          }
        } else {
          if (olderBranch1) {
            uncleAuntTitle = terms.aunt_older;
          } else {
            uncleAuntTitle = paternal ? terms.aunt_paternal : terms.aunt_maternal;
          }
        }
        return {
          title1to2: terms.nephew_niece,
          title2to1: uncleAuntTitle,
          description: `${uncleAuntTitle} - ${terms.nephew_niece}`,
          icon: member1.gender === 'male' ? '👨' : '👩',
          ancestor: ancestorName
        };
      }
    }

    if (genDiff === 2) {
      // Grandparent level
      if (member1IsYounger) {
        const gpTitle = member2.gender === 'male' 
          ? (paternal ? terms.grandfather_paternal : terms.grandfather_maternal)
          : (paternal ? terms.grandmother_paternal : terms.grandmother_maternal);
        const gcTitle = member1.gender === 'male' ? terms.grandson : terms.granddaughter;
        return {
          title1to2: gpTitle + ' họ',
          title2to1: gcTitle + ' họ',
          description: `${gpTitle} họ - ${gcTitle} họ`,
          icon: member2.gender === 'male' ? '👴' : '👵',
          ancestor: ancestorName
        };
      } else {
        const gpTitle = member1.gender === 'male'
          ? (paternal ? terms.grandfather_paternal : terms.grandfather_maternal)
          : (paternal ? terms.grandmother_paternal : terms.grandmother_maternal);
        const gcTitle = member2.gender === 'male' ? terms.grandson : terms.granddaughter;
        return {
          title1to2: gcTitle + ' họ',
          title2to1: gpTitle + ' họ',
          description: `${gpTitle} họ - ${gcTitle} họ`,
          icon: member1.gender === 'male' ? '👴' : '👵',
          ancestor: ancestorName
        };
      }
    }

    // More distant relationships
    const olderMember = member1IsYounger ? member2 : member1;
    return {
      title1to2: member1IsYounger ? `Bậc trên ${genDiff} đời` : `Cháu họ đời ${genDiff}`,
      title2to1: member1IsYounger ? `Cháu họ đời ${genDiff}` : `Bậc trên ${genDiff} đời`,
      description: `Họ hàng cách ${genDiff} đời`,
      icon: '👥',
      ancestor: ancestorName,
      generationDiff: genDiff
    };
  }, [member1, member2, allMembers, memberLevels, selectedDialect, terms]);

  // Calculate in-law relationship helper
  function calculateInLawRelationship(inLawMember, otherMember, bloodSpouse, lcaResult, terms, reversed = false) {
    const { dist1, dist2 } = lcaResult;
    const genDiff = Math.abs(dist1 - dist2);
    
    // Get the blood relative's relationship and convert to in-law title
    let inLawTitle, otherTitle;
    
    if (dist1 === dist2) {
      // Same generation - sibling-in-law
      if (inLawMember.gender === 'male') {
        inLawTitle = terms.brother_in_law_older;
        otherTitle = otherMember.gender === 'male' ? terms.brother_in_law_older : terms.sister_in_law_older;
      } else {
        inLawTitle = terms.sister_in_law_older;
        otherTitle = otherMember.gender === 'male' ? terms.brother_in_law_older : terms.sister_in_law_older;
      }
    } else if (genDiff === 1 && dist1 < dist2) {
      // In-law is uncle/aunt level
      if (inLawMember.gender === 'male') {
        inLawTitle = terms.aunt_husband_paternal; // Chú/Dượng
      } else {
        inLawTitle = terms.uncle_wife_younger; // Thím/Mợ
      }
      otherTitle = terms.nephew_niece;
    } else if (genDiff === 1 && dist1 > dist2) {
      // In-law is nephew/niece level
      inLawTitle = inLawMember.gender === 'male' ? terms.son_in_law : terms.daughter_in_law;
      otherTitle = otherMember.gender === 'male' ? terms.uncle_older : terms.aunt_older;
    } else {
      inLawTitle = 'Họ hàng (thông gia)';
      otherTitle = 'Họ hàng (thông gia)';
    }

    if (reversed) {
      return {
        title1to2: otherTitle,
        title2to1: inLawTitle,
        description: 'Quan hệ thông gia',
        icon: '👪'
      };
    }

    return {
      title1to2: inLawTitle,
      title2to1: otherTitle,
      description: 'Quan hệ thông gia',
      icon: '👪'
    };
  }

  const age1 = calculateAge(member1?.birthDate, member1?.deathDate, member1?.isLiving);
  const age2 = calculateAge(member2?.birthDate, member2?.deathDate, member2?.isLiving);

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
          <span className="slot-title">gọi là "{relationship.title1to2}"</span>
        </div>
      </div>

      {/* Relationship Result in Center */}
      <div className="relationship-slot-result">
        <span className="result-icon">{relationship.icon || '🔗'}</span>
        <span className="result-type">{relationship.description}</span>
        {relationship.ancestor && (
          <span className="result-ancestor">Gốc: {relationship.ancestor}</span>
        )}
        {/* Dialect selector */}
        <div className="dialect-selector">
          <button 
            className={`dialect-btn ${selectedDialect === 'bac' ? 'active' : ''}`}
            onClick={() => setSelectedDialect('bac')}
          >
            Bắc
          </button>
          <button 
            className={`dialect-btn ${selectedDialect === 'trung' ? 'active' : ''}`}
            onClick={() => setSelectedDialect('trung')}
          >
            Trung
          </button>
          <button 
            className={`dialect-btn ${selectedDialect === 'nam' ? 'active' : ''}`}
            onClick={() => setSelectedDialect('nam')}
          >
            Nam
          </button>
        </div>
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
          <span className="slot-title">gọi là "{relationship.title2to1}"</span>
        </div>
      </div>
    </>
  );
}

export default RelationshipPopup;

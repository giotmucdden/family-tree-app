import React, { useMemo, useState } from 'react';

/**
 * Vietnamese Kinship (Vai Vế) Calculator
 *
 * QUAN TRỌNG: Vai vế trong tiếng Việt KHÔNG dựa vào tuổi tác!
 * Vai vế dựa vào:
 * 1. Đời (Thế hệ) - Generation level
 * 2. Nhánh trưởng/thứ - Elder/younger branch based on ancestor birth order
 * 3. Họ nội/ngoại - Paternal/maternal side
 * 4. Giới tính - Gender
 * 5. Huyết thống/Dâu rể - Blood relative vs In-law
 *
 * VD: Dù bạn 60 tuổi, nếu bạn thuộc nhánh thứ, bạn vẫn phải gọi
 *     người 30 tuổi ở nhánh trưởng là "Anh/Chị"
 */

// Error type options cho report form
const ERROR_TYPE_OPTIONS = [
  { value: 'wrong_title', label: 'Sai danh xưng (Cô/Chú/Bác...)' },
  { value: 'wrong_region_bac', label: 'Sai miền Bắc' },
  { value: 'wrong_region_trung', label: 'Sai miền Trung' },
  { value: 'wrong_region_nam', label: 'Sai miền Nam' },
  { value: 'wrong_lineage', label: 'Sai họ nội/ngoại' },
  { value: 'wrong_generation', label: 'Sai thế hệ' },
  { value: 'other', label: 'Lỗi khác' },
];

function RelationshipPopup({ member1, member2, allMembers, dialect = 'trung', familyTreeId, onReportSubmit }) {
  const selectedDialect = dialect; // Mặc định miền Trung

  // State cho Report Modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportForm, setReportForm] = useState({
    errorTypes: [],
    suggestedCorrection: {
      title1to2: '',
      title2to1: '',
      bac: '',
      trung: '',
      nam: '',
    },
    description: '',
  });
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportMessage, setReportMessage] = useState(null);

  // ========== BẢNG DANH XƯNG THEO VÙNG MIỀN ==========
  const dialectMap = {
    bac: { // Miền Bắc
      // Cha mẹ
      father: 'Bố', mother: 'Mẹ',
      // Ông bà
      grandfather_internal: 'Ông nội', grandmother_internal: 'Bà nội',
      grandfather_external: 'Ông ngoại', grandmother_external: 'Bà ngoại',
      // Cụ (đời 3)
      great_gf_internal: 'Cụ ông nội', great_gm_internal: 'Cụ bà nội',
      great_gf_external: 'Cụ ông ngoại', great_gm_external: 'Cụ bà ngoại',
      // Kỵ (đời 4)
      great2_gf: 'Kỵ ông', great2_gm: 'Kỵ bà',
      // Anh chị em ruột
      older_brother: 'Anh', older_sister: 'Chị',
      younger_brother: 'Em trai', younger_sister: 'Em gái',
      // Bác (nhánh trưởng - cả nam và nữ)
      bac_male: 'Bác', bac_female: 'Bác',
      bac_wife: 'Bác gái', bac_husband: 'Bác',
      // Chú/Cô (nhánh thứ - họ nội)
      chu: 'Chú', // Blood - em trai của Cha
      co: 'Cô', // Blood - em gái của Cha
      thim: 'Thím', // Marriage - vợ chú
      duong_of_co: 'Dượng', // Marriage - chồng cô (Bắc gọi là Dượng)
      // Cậu/Dì (họ ngoại)
      cau: 'Cậu', // Blood - anh/em trai của Mẹ
      di: 'Dì', // Blood - chị/em gái của Mẹ
      mo: 'Mợ', // Marriage - vợ cậu
      duong: 'Dượng', // Marriage - chồng dì
      // Anh chị em họ (cùng đời)
      anh_ho: 'Anh họ', chi_ho: 'Chị họ',
      em_ho_male: 'Em họ', em_ho_female: 'Em họ',
      // Con cháu
      son: 'Con trai', daughter: 'Con gái',
      chau: 'Cháu', // cháu gọi chung
      chau_noi: 'Cháu nội', chau_ngoai: 'Cháu ngoại',
      chat: 'Chắt', // đời 3
      chut: 'Chút', // đời 4
      // Vợ chồng
      husband: 'Chồng', wife: 'Vợ',
      // Con dâu rể
      con_dau: 'Con dâu', con_re: 'Con rể',
      // Anh chị em dâu rể
      anh_re: 'Anh rể', chi_dau: 'Chị dâu',
      em_re: 'Em rể', em_dau: 'Em dâu',
      // Cháu dâu rể
      chau_dau: 'Cháu dâu', chau_re: 'Cháu rể',
    },
    trung: { // Miền Trung
      father: 'Ba', mother: 'Mạ',
      grandfather_internal: 'Ông nội', grandmother_internal: 'Bà nội',
      grandfather_external: 'Ông ngoại', grandmother_external: 'Bà ngoại',
      great_gf_internal: 'Ông cố nội', great_gm_internal: 'Bà cố nội',
      great_gf_external: 'Ông cố ngoại', great_gm_external: 'Bà cố ngoại',
      great2_gf: 'Ông sơ', great2_gm: 'Bà sơ',
      older_brother: 'Anh', older_sister: 'Chị',
      younger_brother: 'Em trai', younger_sister: 'Em gái',
      bac_male: 'Bác', bac_female: 'Bác',
      bac_wife: 'Bác gái', bac_husband: 'Bác',
      chu: 'Chú', // Blood - em trai của Cha
      co: 'O', // Blood - Miền Trung gọi Cô là O
      thim: 'Thím', // Marriage - vợ chú
      duong_of_co: 'Dượng', // Marriage - chồng O
      cau: 'Cậu', // Blood
      di: 'Dì', // Blood
      mo: 'Mợ', // Marriage - vợ cậu
      duong: 'Dượng', // Marriage - chồng dì
      anh_ho: 'Anh họ', chi_ho: 'Chị họ',
      em_ho_male: 'Em họ', em_ho_female: 'Em họ',
      son: 'Con trai', daughter: 'Con gái',
      chau: 'Cháu',
      chau_noi: 'Cháu nội', chau_ngoai: 'Cháu ngoại',
      chat: 'Chắt',
      chut: 'Chút',
      husband: 'Chồng', wife: 'Vợ',
      con_dau: 'Con dâu', con_re: 'Con rể',
      anh_re: 'Anh rể', chi_dau: 'Chị dâu',
      em_re: 'Em rể', em_dau: 'Em dâu',
      chau_dau: 'Cháu dâu', chau_re: 'Cháu rể',
    },
    nam: { // Miền Nam
      father: 'Ba', mother: 'Má',
      grandfather_internal: 'Ông nội', grandmother_internal: 'Bà nội',
      grandfather_external: 'Ông ngoại', grandmother_external: 'Bà ngoại',
      great_gf_internal: 'Ông cố nội', great_gm_internal: 'Bà cố nội',
      great_gf_external: 'Ông cố ngoại', great_gm_external: 'Bà cố ngoại',
      great2_gf: 'Ông sơ', great2_gm: 'Bà sơ',
      older_brother: 'Anh', older_sister: 'Chị',
      younger_brother: 'Em trai', younger_sister: 'Em gái',
      bac_male: 'Bác', bac_female: 'Bác',
      bac_wife: 'Bác gái', bac_husband: 'Bác',
      chu: 'Chú', // Blood - em trai của Cha
      co: 'Cô', // Blood - em gái của Cha
      thim: 'Thím', // Marriage - vợ chú
      duong_of_co: 'Chú', // Marriage - chồng cô (Nam gọi là Chú)
      cau: 'Cậu', // Blood
      di: 'Dì', // Blood
      mo: 'Mợ', // Marriage - vợ cậu
      duong: 'Dượng', // Marriage - chồng dì
      anh_ho: 'Anh họ', chi_ho: 'Chị họ',
      em_ho_male: 'Em họ', em_ho_female: 'Em họ',
      son: 'Con trai', daughter: 'Con gái',
      chau: 'Cháu',
      chau_noi: 'Cháu nội', chau_ngoai: 'Cháu ngoại',
      chat: 'Chắt',
      chut: 'Chút',
      husband: 'Chồng', wife: 'Vợ',
      con_dau: 'Con dâu', con_re: 'Con rể',
      anh_re: 'Anh rể', chi_dau: 'Chị dâu',
      em_re: 'Em rể', em_dau: 'Em dâu',
      chau_dau: 'Cháu dâu', chau_re: 'Cháu rể',
    }
  };

  const terms = dialectMap[selectedDialect] || dialectMap.bac;

  // ========== HELPER FUNCTIONS ==========

  const formatMemberName = (m) => {
    if (!m) return '';
    const parts = [m.lastName, m.middleName, m.vnName, m.firstName].filter(Boolean);
    return parts.join(' ');
  };

  const calculateAge = (birthDate, deathDate, isLiving) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const end = isLiving !== false ? new Date() : (deathDate ? new Date(deathDate) : new Date());
    let age = end.getFullYear() - birth.getFullYear();
    const m = end.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && end.getDate() < birth.getDate())) age--;
    return age;
  };

  const getParentIds = (member) => {
    if (!member) return { fatherId: null, motherId: null };
    const fatherId = typeof member.fatherId === 'object' ? member.fatherId?._id : member.fatherId;
    const motherId = typeof member.motherId === 'object' ? member.motherId?._id : member.motherId;
    return { fatherId, motherId };
  };

  const getMemberById = (id) => allMembers.find(m => m._id === id);

  const getSpouse = (member) => {
    if (!member?.spouses || member.spouses.length === 0) return null;
    const marriedSpouse = member.spouses.find(sp => sp.status === 'married');
    const spouseEntry = marriedSpouse || member.spouses[0];
    const spouseId = typeof spouseEntry.memberId === 'object' ? spouseEntry.memberId?._id : spouseEntry.memberId;
    return getMemberById(spouseId);
  };

  const areSpouses = (m1, m2) => {
    if (!m1?.spouses || !m2) return false;
    return m1.spouses.some(sp => {
      const spouseId = typeof sp.memberId === 'object' ? sp.memberId?._id : sp.memberId;
      return spouseId === m2._id;
    });
  };

  // Lấy thứ tự sinh trong anh chị em
  const getBirthOrder = (member) => {
    if (!member) return 999;
    if (member.birthOrder) return member.birthOrder;

    const { fatherId, motherId } = getParentIds(member);
    if (!fatherId && !motherId) return 1;

    // Tìm anh chị em cùng cha hoặc mẹ
    const siblings = allMembers.filter(m => {
      const p = getParentIds(m);
      return (fatherId && p.fatherId === fatherId) || (motherId && p.motherId === motherId);
    });

    // Sắp xếp theo ngày sinh
    siblings.sort((a, b) => {
      if (a.birthDate && b.birthDate) {
        return new Date(a.birthDate) - new Date(b.birthDate);
      }
      return 0;
    });

    const index = siblings.findIndex(s => s._id === member._id);
    return index >= 0 ? index + 1 : 999;
  };

  // ========== THUẬT TOÁN TÌM TỔ TIÊN CHUNG VÀ ĐƯỜNG ĐI ==========

  // Xây dựng TẤT CẢ các đường đi lên tổ tiên (cả họ nội và ngoại)
  const buildAllAncestorPaths = (memberId, visited = new Set(), throughFather = null) => {
    if (!memberId || visited.has(memberId)) return [];

    const member = getMemberById(memberId);
    if (!member) return [];

    const newVisited = new Set(visited);
    newVisited.add(memberId);

    const { fatherId, motherId } = getParentIds(member);
    const birthOrder = getBirthOrder(member);

    const node = {
      id: memberId,
      member,
      birthOrder,
      gender: member.gender,
      throughFather: throughFather, // null cho member gốc
    };

    // Nếu không có cha mẹ -> đây là gốc
    if (!fatherId && !motherId) {
      return [[node]];
    }

    const allPaths = [];

    // Đi theo cha (họ nội)
    if (fatherId) {
      const fatherPaths = buildAllAncestorPaths(fatherId, newVisited, true);
      for (const path of fatherPaths) {
        allPaths.push([{ ...node, throughFather: true }, ...path]);
      }
      // Nếu cha là gốc (không có đường đi tiếp)
      if (fatherPaths.length === 0) {
        const father = getMemberById(fatherId);
        if (father) {
          allPaths.push([
            { ...node, throughFather: true },
            { id: fatherId, member: father, birthOrder: getBirthOrder(father), gender: father.gender, throughFather: null }
          ]);
        }
      }
    }

    // Đi theo mẹ (họ ngoại)
    if (motherId) {
      const motherPaths = buildAllAncestorPaths(motherId, newVisited, false);
      for (const path of motherPaths) {
        allPaths.push([{ ...node, throughFather: false }, ...path]);
      }
      // Nếu mẹ là gốc (không có đường đi tiếp)
      if (motherPaths.length === 0) {
        const mother = getMemberById(motherId);
        if (mother) {
          allPaths.push([
            { ...node, throughFather: false },
            { id: motherId, member: mother, birthOrder: getBirthOrder(mother), gender: mother.gender, throughFather: null }
          ]);
        }
      }
    }

    return allPaths.length > 0 ? allPaths : [[node]];
  };

  // Tìm tổ tiên chung gần nhất (LCA) - tìm trong TẤT CẢ các đường đi
  const findCommonAncestor = (id1, id2) => {
    const allPaths1 = buildAllAncestorPaths(id1);
    const allPaths2 = buildAllAncestorPaths(id2);

    let bestResult = { ancestor: null, path1: [], path2: [], dist1: -1, dist2: -1 };
    let shortestTotal = Infinity;

    // Tìm đường đi ngắn nhất đến tổ tiên chung
    for (const path1 of allPaths1) {
      for (const path2 of allPaths2) {
        for (let i = 0; i < path1.length; i++) {
          for (let j = 0; j < path2.length; j++) {
            if (path1[i].id === path2[j].id) {
              const totalDist = i + j;
              if (totalDist < shortestTotal) {
                shortestTotal = totalDist;
                bestResult = {
                  ancestor: path1[i],
                  path1: path1.slice(0, i + 1),
                  path2: path2.slice(0, j + 1),
                  dist1: i,
                  dist2: j,
                };
              }
              break; // Tìm thấy tổ tiên chung trong path này, không cần tìm tiếp
            }
          }
        }
      }
    }

    return bestResult;
  };

  // ========== XÁC ĐỊNH NHÁNH TRƯỞNG/THỨ ==========

  // Kiểm tra path1 có thuộc nhánh trưởng hơn path2 không
  // Dựa vào thứ tự sinh của tổ tiên trực tiếp dưới tổ tiên chung
  const isElderBranch = (path1, path2, ancestor) => {
    if (!ancestor || path1.length < 2 || path2.length < 2) {
      return null; // Không xác định được
    }

    // Con của tổ tiên chung trong mỗi path
    const child1 = path1[path1.length - 2]; // con của ancestor trong nhánh 1
    const child2 = path2[path2.length - 2]; // con của ancestor trong nhánh 2

    if (!child1 || !child2) return null;

    if (child1.id === child2.id) {
      // Cùng một con của ancestor -> so sánh đời tiếp theo
      if (path1.length >= 3 && path2.length >= 3) {
        const grandchild1 = path1[path1.length - 3];
        const grandchild2 = path2[path2.length - 3];
        if (grandchild1.birthOrder !== grandchild2.birthOrder) {
          return grandchild1.birthOrder < grandchild2.birthOrder;
        }
      }
      return null;
    }

    // Khác con -> so sánh thứ tự sinh
    return child1.birthOrder < child2.birthOrder;
  };

  // Xác định quan hệ là NỘI hay NGOẠI
  // NỘI = qua CON TRAI của tổ tiên chung
  // NGOẠI = qua CON GÁI của tổ tiên chung
  const determineLineage = (path1, path2, ancestor) => {
    if (!ancestor) return 'internal'; // mặc định

    // Tìm con của tổ tiên chung trong đường đi của người trẻ hơn
    // Người trẻ hơn là người có path dài hơn (xa tổ tiên hơn)
    const longerPath = path1.length >= path2.length ? path1 : path2;

    if (longerPath.length < 2) return 'internal';

    // Con của tổ tiên chung (người ở giữa)
    const childOfAncestor = longerPath[longerPath.length - 2];

    if (!childOfAncestor || !childOfAncestor.member) return 'internal';

    // Kiểm tra giới tính của người ở giữa
    if (childOfAncestor.member.gender === 'male') {
      return 'internal'; // Qua con trai = Họ NỘI
    } else if (childOfAncestor.member.gender === 'female') {
      return 'external'; // Qua con gái = Họ NGOẠI
    }

    return 'internal'; // mặc định
  };

  // ========== TÍNH TOÁN QUAN HỆ CHÍNH ==========

  const relationship = useMemo(() => {
    console.log('=== BẮT ĐẦU TÍNH VAI VẾ ===');
    console.log('member1:', formatMemberName(member1), '| gender:', member1?.gender);
    console.log('member2:', formatMemberName(member2), '| gender:', member2?.gender);

    if (!member1 || !member2) {
      console.log('→ Thiếu member, return');
      return { title1to2: '', title2to1: '', description: '', icon: '❓' };
    }

    if (member1._id === member2._id) {
      console.log('→ Cùng 1 người');
      return {
        title1to2: 'Chính mình',
        title2to1: 'Chính mình',
        description: 'Cùng một người',
        icon: '🪞',
        ancestor: 'Chính mình'
      };
    }

    const id1 = member1._id;
    const id2 = member2._id;
    const parents1 = getParentIds(member1);
    const parents2 = getParentIds(member2);

    // ===== 1. KIỂM TRA VỢ CHỒNG =====
    if (areSpouses(member1, member2) || areSpouses(member2, member1)) {
      console.log('→ Quan hệ VỢ CHỒNG');
      return {
        title1to2: member2.gender === 'male' ? terms.husband : terms.wife,
        title2to1: member1.gender === 'male' ? terms.husband : terms.wife,
        description: 'Vợ chồng',
        icon: '💑',
        ancestor: 'Trực tiếp (Vợ chồng)'
      };
    }

    // ===== 2. KIỂM TRA CHA MẸ - CON =====
    if (parents1.fatherId === id2) {
      console.log('→ Member2 là CHA của Member1');
      return {
        title1to2: terms.father,
        title2to1: member1.gender === 'male' ? terms.son : terms.daughter,
        description: `${terms.father} - Con`,
        icon: '👨',
        ancestor: 'Trực tiếp (Cha - Con)'
      };
    }
    if (parents1.motherId === id2) {
      console.log('→ Member2 là MẸ của Member1');
      return {
        title1to2: terms.mother,
        title2to1: member1.gender === 'male' ? terms.son : terms.daughter,
        description: `${terms.mother} - Con`,
        icon: '👩',
        ancestor: 'Trực tiếp (Mẹ - Con)'
      };
    }
    if (parents2.fatherId === id1) {
      console.log('→ Member1 là CHA của Member2');
      return {
        title1to2: member2.gender === 'male' ? terms.son : terms.daughter,
        title2to1: terms.father,
        description: `${terms.father} - Con`,
        icon: '👨',
        ancestor: 'Trực tiếp (Cha - Con)'
      };
    }
    if (parents2.motherId === id1) {
      console.log('→ Member1 là MẸ của Member2');
      return {
        title1to2: member2.gender === 'male' ? terms.son : terms.daughter,
        title2to1: terms.mother,
        description: `${terms.mother} - Con`,
        icon: '👩',
        ancestor: 'Trực tiếp (Mẹ - Con)'
      };
    }

    // ===== 3. TÌM TỔ TIÊN CHUNG =====
    console.log('→ Đang tìm tổ tiên chung...');
    const { ancestor, path1, path2, dist1, dist2 } = findCommonAncestor(id1, id2);
    console.log('ancestor:', ancestor ? formatMemberName(ancestor.member) : 'KHÔNG TÌM THẤY');
    console.log('dist1:', dist1, '| dist2:', dist2);

    if (!ancestor) {
      console.log('→ KHÔNG TÌM THẤY tổ tiên chung, kiểm tra qua spouse...');
      // Không tìm thấy tổ tiên chung - có thể là quan hệ thông gia
      const spouse1 = getSpouse(member1);
      const spouse2 = getSpouse(member2);
      console.log('spouse1:', spouse1 ? formatMemberName(spouse1) : 'null');
      console.log('spouse2:', spouse2 ? formatMemberName(spouse2) : 'null');

      // Kiểm tra member1 là dâu/rể (spouse1 có quan hệ với member2)
      if (spouse1) {
        // FIX: Đổi thứ tự để dist1 = bloodMember (id2), dist2 = bloodSpouse (spouse1)
        const spouseResult = findCommonAncestor(id2, spouse1._id);
        console.log('Tìm qua spouse1, ancestor:', spouseResult.ancestor ? formatMemberName(spouseResult.ancestor.member) : 'null');
        if (spouseResult.ancestor) {
          console.log('→ Member1 là DÂU/RỂ, tính qua calculateInLawRelation');
          return calculateInLawRelation(member1, member2, spouse1, spouseResult);
        }
      }

      // Kiểm tra member2 là dâu/rể (spouse2 có quan hệ với member1)
      if (spouse2) {
        const spouseResult = findCommonAncestor(id1, spouse2._id);
        console.log('Tìm qua spouse2, ancestor:', spouseResult.ancestor ? formatMemberName(spouseResult.ancestor.member) : 'null');
        if (spouseResult.ancestor) {
          console.log('→ Member2 là DÂU/RỂ, tính qua calculateInLawRelation');
          const result = calculateInLawRelation(member2, member1, spouse2, spouseResult);
          return {
            title1to2: result.title2to1,
            title2to1: result.title1to2,
            description: result.description,
            icon: result.icon,
            ancestor: result.ancestor
          };
        }
      }

      // ===== MỚI: Kiểm tra CẢ HAI VỢ/CHỒNG có quan hệ với nhau không =====
      // Trường hợp: cả 2 người đều không có quan hệ máu mủ trực tiếp,
      // nhưng vợ/chồng của họ có quan hệ → thông gia, gọi theo vợ/chồng
      if (spouse1 && spouse2) {
        const spousesResult = findCommonAncestor(spouse1._id, spouse2._id);
        console.log('Tìm qua CẢ HAI VỢ/CHỒNG, ancestor:', spousesResult.ancestor ? formatMemberName(spousesResult.ancestor.member) : 'null');

        if (spousesResult.ancestor) {
          console.log('→ Hai vợ/chồng có quan hệ với nhau, tính theo vai của họ...');
          const { dist1: spDist1, dist2: spDist2, path1: spPath1, path2: spPath2 } = spousesResult;
          const ancestorName = formatMemberName(spousesResult.ancestor?.member);
          const genDiff = Math.abs(spDist1 - spDist2);
          const spouse1IsOlderGen = spDist1 < spDist2;

          // Xác định vai vế giữa hai spouse
          const spouseLineage = determineLineage(spPath1, spPath2, spousesResult.ancestor);
          const spouseIsInternal = spouseLineage === 'internal';
          const spouseElderBranch = isElderBranch(spPath1, spPath2, spousesResult.ancestor);

          console.log('spDist1:', spDist1, 'spDist2:', spDist2, 'genDiff:', genDiff);
          console.log('spouse1IsOlderGen:', spouse1IsOlderGen);

          // Cùng đời - hai vợ/chồng là anh chị em
          if (genDiff === 0) {
            // Xác định ai là anh/chị dựa trên nhánh
            if (spDist1 === 1) {
              // Anh chị em ruột
              const spouse1IsBigger = getBirthOrder(spouse1) < getBirthOrder(spouse2);
              if (spouse1IsBigger) {
                // spouse1 là anh/chị → member1 gọi member2 theo spouse
                return {
                  title1to2: member2.gender === 'male' ? 'Em rể' : 'Em dâu',
                  title2to1: member1.gender === 'male' ? 'Anh rể' : 'Chị dâu',
                  description: `Anh em đồng hao (vợ/chồng là anh chị em ruột)`,
                  icon: '🤝',
                  ancestor: ancestorName
                };
              } else {
                return {
                  title1to2: member2.gender === 'male' ? 'Anh rể' : 'Chị dâu',
                  title2to1: member1.gender === 'male' ? 'Em rể' : 'Em dâu',
                  description: `Anh em đồng hao (vợ/chồng là anh chị em ruột)`,
                  icon: '🤝',
                  ancestor: ancestorName
                };
              }
            } else {
              // Anh chị em họ - dựa vào nhánh
              if (spouseElderBranch === true) {
                // spouse1 nhánh trưởng
                return {
                  title1to2: member2.gender === 'male' ? 'Em rể họ' : 'Em dâu họ',
                  title2to1: member1.gender === 'male' ? 'Anh rể họ' : 'Chị dâu họ',
                  description: `Thông gia (vợ/chồng là anh chị em họ)`,
                  icon: '🤝',
                  ancestor: ancestorName
                };
              } else if (spouseElderBranch === false) {
                return {
                  title1to2: member2.gender === 'male' ? 'Anh rể họ' : 'Chị dâu họ',
                  title2to1: member1.gender === 'male' ? 'Em rể họ' : 'Em dâu họ',
                  description: `Thông gia (vợ/chồng là anh chị em họ)`,
                  icon: '🤝',
                  ancestor: ancestorName
                };
              } else {
                return {
                  title1to2: 'Thông gia',
                  title2to1: 'Thông gia',
                  description: `Thông gia (vợ/chồng là anh chị em họ)`,
                  icon: '🤝',
                  ancestor: ancestorName
                };
              }
            }
          }

          // Khác đời - gọi theo vai của vợ/chồng
          if (spouse1IsOlderGen) {
            // spouse1 vai trên → member1 gọi member2 là "cháu rể/dâu"
            // spouse2 vai dưới → member2 gọi member1 theo vai của spouse1
            let title2CallsMember1;
            if (genDiff === 1) {
              // spouse1 là Cô/Chú/Bác của spouse2
              if (spouseElderBranch === true) {
                title2CallsMember1 = terms.bac_male; // Bác
              } else if (spouseIsInternal) {
                title2CallsMember1 = member1.gender === 'male' ? terms.chu : terms.co;
              } else {
                title2CallsMember1 = member1.gender === 'male' ? terms.cau : terms.di;
              }
            } else if (genDiff === 2) {
              title2CallsMember1 = member1.gender === 'male' ? terms.grandfather_internal : terms.grandmother_internal;
            } else {
              title2CallsMember1 = `Bậc trên ${genDiff} đời`;
            }

            return {
              title1to2: member2.gender === 'male' ? 'Cháu rể' : 'Cháu dâu',
              title2to1: title2CallsMember1,
              description: `Thông gia (${title2CallsMember1} - Cháu)`,
              icon: member1.gender === 'male' ? '👨' : '👩',
              ancestor: ancestorName
            };
          } else {
            // spouse2 vai trên → member2 gọi member1 là "cháu rể/dâu"
            // spouse1 vai dưới → member1 gọi member2 theo vai của spouse2
            let title1CallsMember2;
            if (genDiff === 1) {
              if (spouseElderBranch === false) {
                title1CallsMember2 = terms.bac_male; // Bác
              } else if (spouseIsInternal) {
                title1CallsMember2 = member2.gender === 'male' ? terms.chu : terms.co;
              } else {
                title1CallsMember2 = member2.gender === 'male' ? terms.cau : terms.di;
              }
            } else if (genDiff === 2) {
              title1CallsMember2 = member2.gender === 'male' ? terms.grandfather_internal : terms.grandmother_internal;
            } else {
              title1CallsMember2 = `Bậc trên ${genDiff} đời`;
            }

            return {
              title1to2: title1CallsMember2,
              title2to1: member1.gender === 'male' ? 'Cháu rể' : 'Cháu dâu',
              description: `Thông gia (${title1CallsMember2} - Cháu)`,
              icon: member2.gender === 'male' ? '👨' : '👩',
              ancestor: ancestorName
            };
          }
        }
      }

      console.log('→ Không tìm được quan hệ');
      return {
        title1to2: 'Không xác định',
        title2to1: 'Không xác định',
        description: 'Chưa tìm thấy mối quan hệ',
        icon: '❓',
        ancestor: 'Không xác định'
      };
    }

    const ancestorName = formatMemberName(ancestor.member);
    const genDiff = Math.abs(dist1 - dist2);
    const member1IsYoungerGen = dist1 > dist2;
    const elderBranch1 = isElderBranch(path1, path2, ancestor);
    const lineage = determineLineage(path1, path2, ancestor);
    const isInternal = lineage === 'internal'; // Họ nội

    console.log('genDiff:', genDiff);
    console.log('member1IsYoungerGen:', member1IsYoungerGen);
    console.log('elderBranch1:', elderBranch1);
    console.log('lineage:', lineage, '| isInternal:', isInternal);

    // ===== 4. CÙNG THẾ HỆ (NGANG HÀNG) =====
    if (dist1 === dist2) {

      // 4a. Anh chị em ruột (cùng cha mẹ)
      if (dist1 === 1) {
        // Xác định ai là anh/chị dựa trên thứ tự sinh (KHÔNG phải tuổi!)
        const order1 = getBirthOrder(member1);
        const order2 = getBirthOrder(member2);

        if (order1 < order2) {
          // Member1 sinh trước -> Member1 là anh/chị
          return {
            title1to2: member2.gender === 'male' ? terms.younger_brother : terms.younger_sister,
            title2to1: member1.gender === 'male' ? terms.older_brother : terms.older_sister,
            description: 'Anh chị em ruột',
            icon: '👫',
            ancestor: ancestorName
          };
        } else {
          // Member2 sinh trước -> Member2 là anh/chị
          return {
            title1to2: member2.gender === 'male' ? terms.older_brother : terms.older_sister,
            title2to1: member1.gender === 'male' ? terms.younger_brother : terms.younger_sister,
            description: 'Anh chị em ruột',
            icon: '👫',
            ancestor: ancestorName
          };
        }
      }

      // 4b. Anh chị em họ (khác cha mẹ, cùng ông bà hoặc xa hơn)
      // QUAN TRỌNG: Dựa vào NHÁNH, không phải tuổi!
      let title1to2, title2to1;

      if (elderBranch1 === true) {
        // Member1 thuộc nhánh trưởng -> Member1 là "anh/chị" của Member2
        title1to2 = terms.em_ho_male; // Member1 gọi Member2 là em
        title2to1 = member1.gender === 'male' ? terms.anh_ho : terms.chi_ho;
      } else if (elderBranch1 === false) {
        // Member2 thuộc nhánh trưởng -> Member2 là "anh/chị" của Member1
        title1to2 = member2.gender === 'male' ? terms.anh_ho : terms.chi_ho;
        title2to1 = terms.em_ho_male;
      } else {
        // Không xác định được nhánh -> dùng giới tính
        title1to2 = member2.gender === 'male' ? terms.anh_ho : terms.chi_ho;
        title2to1 = member1.gender === 'male' ? terms.anh_ho : terms.chi_ho;
      }

      const genText = dist1 === 2 ? 'cùng ông bà' :
                      dist1 === 3 ? 'cùng cụ' :
                      dist1 === 4 ? 'cùng kỵ' : `cách ${dist1 - 1} đời`;

      return {
        title1to2,
        title2to1,
        description: `Anh chị em họ (${genText})`,
        icon: '🤝',
        ancestor: ancestorName,
        note: elderBranch1 !== null ?
          (elderBranch1 ? `${formatMemberName(member1)} thuộc nhánh trưởng` :
                         `${formatMemberName(member2)} thuộc nhánh trưởng`) : null
      };
    }

    // ===== 5. KHÁC THẾ HỆ =====

    // 5a. Chênh 1 đời - Bác/Chú/Cô/Cậu/Dì và Cháu
    if (genDiff === 1) {
      const olderMember = member1IsYoungerGen ? member2 : member1;
      const youngerMember = member1IsYoungerGen ? member1 : member2;
      const olderPath = member1IsYoungerGen ? path2 : path1;
      const youngerPath = member1IsYoungerGen ? path1 : path2;

      // Xác định nhánh trưởng/thứ
      const isOlderBranch = isElderBranch(olderPath, youngerPath, ancestor);

      // DEBUG - Xem thông tin
      console.log('=== DEBUG VAI VẾ ===');
      console.log('olderMember:', formatMemberName(olderMember), '| gender:', olderMember.gender);
      console.log('youngerMember:', formatMemberName(youngerMember));
      console.log('isOlderBranch:', isOlderBranch);
      console.log('isInternal (họ nội):', isInternal);
      console.log('olderPath IDs:', olderPath.map(n => n.id));
      console.log('olderMember._id:', olderMember._id);

      let olderTitle;
      let spouseTitle = null;

      // Xác định danh xưng dựa trên:
      // 1. Nhánh trưởng hay thứ
      // 2. Họ nội hay ngoại
      // 3. Giới tính của olderMember

      if (isOlderBranch === true) {
        // Nhánh trưởng -> Bác (cả nam và nữ đều gọi là Bác)
        olderTitle = terms.bac_male; // Bác
        if (olderMember.gender === 'male') {
          spouseTitle = terms.bac_wife; // Bác gái (vợ Bác)
        } else {
          spouseTitle = terms.bac_husband; // Bác (chồng Bác)
        }
        console.log('→ Nhánh trưởng → Bác');
      } else {
        // Nhánh thứ
        if (isInternal) {
          // Họ nội (qua con trai)
          if (olderMember.gender === 'male') {
            olderTitle = terms.chu; // Chú
            spouseTitle = terms.thim; // Thím (vợ Chú)
            console.log('→ Nhánh thứ, họ nội, NAM → Chú');
          } else {
            olderTitle = terms.co; // Cô
            spouseTitle = terms.duong_of_co; // Dượng/Chú (chồng Cô)
            console.log('→ Nhánh thứ, họ nội, NỮ → Cô');
          }
        } else {
          // Họ ngoại (qua con gái)
          if (olderMember.gender === 'male') {
            olderTitle = terms.cau; // Cậu
            spouseTitle = terms.mo; // Mợ (vợ Cậu)
            console.log('→ Nhánh thứ, họ ngoại, NAM → Cậu');
          } else {
            olderTitle = terms.di; // Dì
            spouseTitle = terms.duong; // Dượng (chồng Dì)
            console.log('→ Nhánh thứ, họ ngoại, NỮ → Dì');
          }
        }
      }

      // Kiểm tra xem olderMember có phải là DÂU/RỂ không
      const olderMemberId = String(olderMember._id);
      const olderMemberInPath = olderPath.some(node => String(node.id) === olderMemberId);

      console.log('olderMemberInPath:', olderMemberInPath);
      console.log('olderTitle sau bước 1:', olderTitle);

      if (!olderMemberInPath) {
        console.log('→ olderMember KHÔNG trong path, kiểm tra dâu/rể...');
        const olderMemberSpouse = getSpouse(olderMember);
        console.log('olderMemberSpouse:', olderMemberSpouse ? formatMemberName(olderMemberSpouse) : 'null');

        if (olderMemberSpouse) {
          const spouseId = String(olderMemberSpouse._id);
          const spouseInPath = olderPath.some(node => String(node.id) === spouseId);
          console.log('spouseInPath:', spouseInPath);

          if (spouseInPath) {
            console.log('→ Spouse trong path, olderMember là DÂU/RỂ');
            if (olderMember.gender === 'male') {
              if (isOlderBranch) {
                olderTitle = terms.bac_husband;
              } else if (isInternal) {
                olderTitle = terms.duong_of_co;
              } else {
                olderTitle = terms.duong;
              }
              console.log('→ RỂ, olderTitle:', olderTitle);
            } else {
              if (isOlderBranch) {
                olderTitle = terms.bac_wife;
              } else if (isInternal) {
                olderTitle = terms.thim;
              } else {
                olderTitle = terms.mo;
              }
              console.log('→ DÂU, olderTitle:', olderTitle);
            }
            spouseTitle = null;
          }
        }
      }

      console.log('=== KẾT QUẢ CUỐI: olderTitle =', olderTitle, '===');

      if (member1IsYoungerGen) {
        return {
          title1to2: olderTitle,
          title2to1: terms.chau,
          description: `${olderTitle} - ${terms.chau}`,
          icon: olderMember.gender === 'male' ? '👨' : '👩',
          ancestor: ancestorName,
          spouseTitle: spouseTitle
        };
      } else {
        return {
          title1to2: terms.chau,
          title2to1: olderTitle,
          description: `${olderTitle} - ${terms.chau}`,
          icon: olderMember.gender === 'male' ? '👨' : '👩',
          ancestor: ancestorName,
          spouseTitle: spouseTitle
        };
      }
    }

    // 5b. Chênh 2 đời - Ông bà và Cháu
    if (genDiff === 2) {
      const olderMember = member1IsYoungerGen ? member2 : member1;

      let olderTitle;
      if (isInternal) {
        olderTitle = olderMember.gender === 'male' ? terms.grandfather_internal : terms.grandmother_internal;
      } else {
        olderTitle = olderMember.gender === 'male' ? terms.grandfather_external : terms.grandmother_external;
      }

      // Nếu không phải ông bà ruột (dist > 2), thêm "họ"
      const isDirectGrandparent = (dist1 === 0 || dist2 === 0);
      if (!isDirectGrandparent && (dist1 > 2 || dist2 > 2)) {
        olderTitle += ' họ';
      }

      const chauTitle = isInternal ? terms.chau_noi : terms.chau_ngoai;

      if (member1IsYoungerGen) {
        return {
          title1to2: olderTitle,
          title2to1: chauTitle,
          description: `${olderTitle} - ${chauTitle}`,
          icon: olderMember.gender === 'male' ? '👴' : '👵',
          ancestor: ancestorName
        };
      } else {
        return {
          title1to2: chauTitle,
          title2to1: olderTitle,
          description: `${olderTitle} - ${chauTitle}`,
          icon: olderMember.gender === 'male' ? '👴' : '👵',
          ancestor: ancestorName
        };
      }
    }

    // 5c. Chênh 3 đời - Cụ và Chắt
    if (genDiff === 3) {
      const olderMember = member1IsYoungerGen ? member2 : member1;
      let olderTitle;
      if (isInternal) {
        olderTitle = olderMember.gender === 'male' ? terms.great_gf_internal : terms.great_gm_internal;
      } else {
        olderTitle = olderMember.gender === 'male' ? terms.great_gf_external : terms.great_gm_external;
      }

      if (member1IsYoungerGen) {
        return {
          title1to2: olderTitle,
          title2to1: terms.chat,
          description: `${olderTitle} - ${terms.chat}`,
          icon: '👴',
          ancestor: ancestorName
        };
      } else {
        return {
          title1to2: terms.chat,
          title2to1: olderTitle,
          description: `${olderTitle} - ${terms.chat}`,
          icon: '👴',
          ancestor: ancestorName
        };
      }
    }

    // 5d. Chênh 4 đời trở lên - Kỵ/Sơ và Chút
    if (genDiff >= 4) {
      const olderMember = member1IsYoungerGen ? member2 : member1;
      const olderTitle = olderMember.gender === 'male' ? terms.great2_gf : terms.great2_gm;
      const youngerTitle = genDiff === 4 ? terms.chut : `Cháu đời ${genDiff}`;

      if (member1IsYoungerGen) {
        return {
          title1to2: olderTitle + (genDiff > 4 ? ` đời ${genDiff}` : ''),
          title2to1: youngerTitle,
          description: `Họ hàng cách ${genDiff} đời`,
          icon: '👥',
          ancestor: ancestorName
        };
      } else {
        return {
          title1to2: youngerTitle,
          title2to1: olderTitle + (genDiff > 4 ? ` đời ${genDiff}` : ''),
          description: `Họ hàng cách ${genDiff} đời`,
          icon: '👥',
          ancestor: ancestorName
        };
      }
    }

    return {
      title1to2: 'Họ hàng',
      title2to1: 'Họ hàng',
      description: 'Quan hệ họ hàng',
      icon: '👥',
      ancestor: ancestorName
    };

  }, [member1, member2, allMembers, selectedDialect, terms]);

  // ===== TÍNH QUAN HỆ DÂU RỂ =====
  // inLawMember = người là dâu/rể (không có quan hệ máu mủ trực tiếp)
  // bloodMember = người trong dòng họ
  // bloodSpouse = vợ/chồng của inLawMember (người có quan hệ máu mủ)
  // lcaResult = kết quả tìm tổ tiên chung giữa bloodMember và bloodSpouse
  function calculateInLawRelation(inLawMember, bloodMember, bloodSpouse, lcaResult) {
    const { dist1, dist2, ancestor } = lcaResult;
    // dist1 = khoảng cách từ bloodMember đến ancestor
    // dist2 = khoảng cách từ bloodSpouse đến ancestor
    const genDiff = Math.abs(dist1 - dist2);
    const ancestorName = formatMemberName(ancestor?.member);

    console.log('=== calculateInLawRelation ===');
    console.log('inLawMember (dâu/rể):', formatMemberName(inLawMember), '| gender:', inLawMember.gender);
    console.log('bloodMember:', formatMemberName(bloodMember), '| gender:', bloodMember.gender);
    console.log('bloodSpouse (vợ/chồng của inLawMember):', formatMemberName(bloodSpouse));
    console.log('dist1 (bloodMember to ancestor):', dist1);
    console.log('dist2 (bloodSpouse to ancestor):', dist2);
    console.log('genDiff:', genDiff);

    // Xác định quan hệ giữa bloodMember và bloodSpouse trước
    // Sau đó inLawMember sẽ gọi bloodMember theo cách mà bloodSpouse gọi

    const bloodMemberIsOlder = dist1 < dist2; // bloodMember gần ancestor hơn = vai trên
    console.log('bloodMemberIsOlder:', bloodMemberIsOlder);

    // Cùng thế hệ - anh/chị em dâu/rể
    if (genDiff === 0) {
      let titleForInLaw, titleForBlood;

      // inLawMember gọi bloodMember như bloodSpouse gọi (anh/chị/em họ)
      // bloodMember gọi inLawMember là dâu/rể
      if (inLawMember.gender === 'male') {
        titleForInLaw = terms.anh_re; // Anh rể
        titleForBlood = bloodMember.gender === 'male' ? terms.anh_ho : terms.chi_ho;
      } else {
        titleForInLaw = terms.chi_dau; // Chị dâu
        titleForBlood = bloodMember.gender === 'male' ? terms.anh_ho : terms.chi_ho;
      }

      console.log('→ Cùng thế hệ, titleForBlood:', titleForBlood, 'titleForInLaw:', titleForInLaw);

      return {
        title1to2: titleForBlood, // inLawMember gọi bloodMember
        title2to1: titleForInLaw, // bloodMember gọi inLawMember
        description: 'Anh chị em dâu/rể',
        icon: '👪',
        ancestor: ancestorName
      };
    }

    // Khác thế hệ
    if (bloodMemberIsOlder) {
      // bloodMember là vai trên (Cô/Chú/Bác của bloodSpouse)
      // inLawMember (chồng/vợ của bloodSpouse) phải gọi bloodMember như bloodSpouse gọi
      // bloodMember gọi inLawMember là "cháu rể" hoặc "cháu dâu"

      let titleBloodMemberIsCalled; // bloodMember được gọi là gì
      if (genDiff === 1) {
        // bloodMember là Cô/Chú/Bác của bloodSpouse
        titleBloodMemberIsCalled = bloodMember.gender === 'male' ? terms.chu : terms.co;
      } else if (genDiff === 2) {
        // Dùng "Ông"/"Bà" cho họ hàng, không phải "Ông nội"/"Bà nội" (vì không phải quan hệ trực tiếp)
        titleBloodMemberIsCalled = bloodMember.gender === 'male' ? 'Ông' : 'Bà';
      } else {
        titleBloodMemberIsCalled = 'Bậc trên ' + genDiff + ' đời';
      }

      const titleInLawIsCalled = inLawMember.gender === 'male' ? 'Cháu rể' : 'Cháu dâu';

      console.log('→ bloodMember vai trên, inLaw gọi bloodMember:', titleBloodMemberIsCalled);
      console.log('→ bloodMember gọi inLaw:', titleInLawIsCalled);

      return {
        title1to2: titleBloodMemberIsCalled, // inLawMember gọi bloodMember
        title2to1: titleInLawIsCalled, // bloodMember gọi inLawMember
        description: `${titleBloodMemberIsCalled} - ${titleInLawIsCalled}`,
        icon: bloodMember.gender === 'male' ? '👨' : '👩',
        ancestor: ancestorName
      };
    } else {
      // bloodMember là vai dưới (cháu của bloodSpouse)
      // inLawMember phải gọi bloodMember là "cháu"
      // bloodMember gọi inLawMember theo vai của bloodSpouse

      let titleInLawIsCalled; // inLawMember được gọi là gì
        if (genDiff === 1) {
          // inLawMember là vợ/chồng của Cô/Chú/Bác
          // bloodMember gọi inLawMember: nam → Dượng (chồng Cô/Dì), nữ → Thím (vợ Chú)
          titleInLawIsCalled = inLawMember.gender === 'male' ? terms.duong : terms.thim;
      } else if (genDiff === 2) {
        // Dùng "Ông"/"Bà" cho họ hàng, không phải "Ông nội"/"Bà nội" (vì không phải quan hệ trực tiếp)
        titleInLawIsCalled = inLawMember.gender === 'male' ? 'Ông' : 'Bà';
      } else {
        titleInLawIsCalled = 'Bậc trên ' + genDiff + ' đời';
      }

      const titleBloodMemberIsCalled = bloodMember.gender === 'male' ? 'Cháu trai' : 'Cháu gái';

      console.log('→ bloodMember vai dưới, inLaw gọi bloodMember:', titleBloodMemberIsCalled);
      console.log('→ bloodMember gọi inLaw:', titleInLawIsCalled);

      return {
        title1to2: titleBloodMemberIsCalled, // inLawMember gọi bloodMember
        title2to1: titleInLawIsCalled, // bloodMember gọi inLawMember
        description: `${titleInLawIsCalled} - ${titleBloodMemberIsCalled}`,
        icon: inLawMember.gender === 'male' ? '👨' : '👩',
        ancestor: ancestorName
      };
    }
  }

  const age1 = calculateAge(member1?.birthDate, member1?.deathDate, member1?.isLiving);
  const age2 = calculateAge(member2?.birthDate, member2?.deathDate, member2?.isLiving);

  // Tính titles cho cả 3 vùng miền và gộp nếu giống nhau
  // Hoán đổi: hiển thị title2to1 ↔ title1to2 (giống slot-title đã hoán đổi)
  const dialectTitles = useMemo(() => {
    if (!relationship.title1to2 || !relationship.title2to1) return null;

    const t1 = relationship.title2to1; // Hoán đổi: dùng title2to1 trước
    const t2 = relationship.title1to2; // Hoán đổi: dùng title1to2 sau

    // Tính cho từng vùng miền
      // Bắc: giữ nguyên (Dượng cho chồng Cô, Dượng cho chồng Dì)
      // Trung: Cô → O, giữ Dượng
      // Nam: Dượng (chồng Cô) → Chú (theo bảng chuẩn: chồng Cô ở Nam gọi là Chú)
      const bac = `${t1} ↔ ${t2}`;
      const trung = `${t1.replace(/Cô/g, 'O').replace(/Bố/g, 'Ba').replace(/Mẹ/g, 'Mạ')} ↔ ${t2.replace(/Cô/g, 'O').replace(/Bố/g, 'Ba').replace(/Mẹ/g, 'Mạ')}`;
      const nam = `${t1.replace(/Dượng/g, 'Chú').replace(/Bố/g, 'Ba').replace(/Mẹ/g, 'Má')} ↔ ${t2.replace(/Dượng/g, 'Chú').replace(/Bố/g, 'Ba').replace(/Mẹ/g, 'Má')}`;

    // Gộp các vùng có cùng tên gọi
    const groups = [];

    if (bac === trung && trung === nam) {
      // Cả 3 giống nhau
      groups.push({ regions: 'Bắc/Trung/Nam', value: bac });
    } else if (bac === trung) {
      groups.push({ regions: 'Bắc/Trung', value: bac });
      groups.push({ regions: 'Nam', value: nam });
    } else if (trung === nam) {
      groups.push({ regions: 'Bắc', value: bac });
      groups.push({ regions: 'Trung/Nam', value: trung });
    } else if (bac === nam) {
      groups.push({ regions: 'Bắc/Nam', value: bac });
      groups.push({ regions: 'Trung', value: trung });
    } else {
      // Cả 3 khác nhau
      groups.push({ regions: 'Bắc', value: bac });
      groups.push({ regions: 'Trung', value: trung });
      groups.push({ regions: 'Nam', value: nam });
    }

    return groups;
  }, [relationship]);

  // ===== SELECTED DIALECT TITLES =====
  const selectedDialectTitles = useMemo(() => {
    if (!relationship?.title1to2 || !relationship?.title2to1) {
      return { title1to2: '', title2to1: '' };
    }

    const t1 = relationship.title1to2;
    const t2 = relationship.title2to1;

    if (selectedDialect === 'bac') {
      // Bắc: Cô/Chú, Bác, Bố/Mẹ
      return {
        title1to2: t1.replace(/O\b/g, 'Cô').replace(/Dượng/g, 'Chú').replace(/Ba\b/g, 'Bố').replace(/Má\b/g, 'Mẹ'),
        title2to1: t2.replace(/O\b/g, 'Cô').replace(/Dượng/g, 'Chú').replace(/Ba\b/g, 'Bố').replace(/Má\b/g, 'Mẹ')
      };
    } else if (selectedDialect === 'trung') {
      // Trung: O/Dượng (đã là mặc định trong calculation)
      return {
        title1to2: t1,
        title2to1: t2
      };
    } else {
      // Nam: Cô/Chú, Ba/Má
      return {
        title1to2: t1.replace(/O\b/g, 'Cô').replace(/Dượng/g, 'Chú').replace(/Bố/g, 'Ba').replace(/Mẹ/g, 'Má'),
        title2to1: t2.replace(/O\b/g, 'Cô').replace(/Dượng/g, 'Chú').replace(/Bố/g, 'Ba').replace(/Mẹ/g, 'Má')
      };
    }
  }, [relationship, selectedDialect]);

  // ===== REPORT HANDLERS =====
  const handleReportErrorType = (errorType) => {
    setReportForm(prev => ({
      ...prev,
      errorTypes: prev.errorTypes.includes(errorType)
        ? prev.errorTypes.filter(e => e !== errorType)
        : [...prev.errorTypes, errorType],
    }));
  };

  const handleReportSubmit = async () => {
    if (reportForm.errorTypes.length === 0) {
      setReportMessage({ type: 'error', text: 'Vui lòng chọn ít nhất một loại lỗi' });
      return;
    }

    setReportSubmitting(true);
    setReportMessage(null);

    try {
      const response = await fetch('/api/vaive-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          familyTreeId,
          member1Id: member1?._id,
          member1Name: formatMemberName(member1),
          member2Id: member2?._id,
          member2Name: formatMemberName(member2),
          systemResult: {
            title1to2: relationship.title1to2,
            title2to1: relationship.title2to1,
            bac: dialectTitles?.find(g => g.regions.includes('Bắc'))?.value || '',
            trung: dialectTitles?.find(g => g.regions.includes('Trung'))?.value || '',
            nam: dialectTitles?.find(g => g.regions.includes('Nam'))?.value || '',
          },
          errorTypes: reportForm.errorTypes,
          suggestedCorrection: reportForm.suggestedCorrection,
          description: reportForm.description,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setReportMessage({ type: 'success', text: data.message || 'Đã gửi báo cáo thành công!' });
        // Reset form sau 2 giây
        setTimeout(() => {
          setShowReportModal(false);
          setReportForm({
            errorTypes: [],
            suggestedCorrection: { title1to2: '', title2to1: '', bac: '', trung: '', nam: '' },
            description: '',
          });
          setReportMessage(null);
        }, 2000);

        // Callback nếu có
        if (onReportSubmit) {
          onReportSubmit(data.report);
        }
      } else {
        setReportMessage({ type: 'error', text: data.error || 'Có lỗi xảy ra' });
      }
    } catch (err) {
      console.error('Error submitting report:', err);
      setReportMessage({ type: 'error', text: 'Không thể gửi báo cáo. Vui lòng thử lại.' });
    } finally {
      setReportSubmitting(false);
    }
  };

  // ===== RENDER =====
  return (
    <>
      {/* Member 1 - hiển thị title2to1 (member2 gọi member1 là gì) */}
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
          <span className="slot-title">"{selectedDialectTitles.title2to1}"</span>
        </div>
      </div>

      {/* Kết quả quan hệ */}
      <div className="relationship-slot-result">
        {relationship.ancestor && (
          <span className="result-ancestor">Gốc: {relationship.ancestor}</span>
        )}
        {relationship.note && (
          <span className="result-note">{relationship.note}</span>
        )}
        {/* Hiển thị vùng miền - gộp nếu giống nhau */}
        {dialectTitles && (
          <div className="dialect-display">
            {dialectTitles.map((group, idx) => (
              <div className="dialect-row" key={idx}>
                <span className="dialect-label">{group.regions}:</span>
                <span className="dialect-value">{group.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Nút báo cáo sai */}
        <button
          className="report-wrong-btn"
          onClick={() => setShowReportModal(true)}
          title="Báo cáo sai vai vế"
        >
          ⚠️ Báo cáo sai
        </button>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="report-modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="report-modal" onClick={e => e.stopPropagation()}>
            <div className="report-modal-header">
              <h3>📝 Báo cáo sai Vai Vế</h3>
              <button className="close-btn" onClick={() => setShowReportModal(false)}>×</button>
            </div>

            <div className="report-modal-body">
              {/* Thông tin hiện tại */}
              <div className="report-current-info">
                <strong>Hệ thống hiển thị:</strong>
                <div className="current-result">
                  <span>{formatMemberName(member1)} gọi {formatMemberName(member2)}: <b>{relationship.title1to2}</b></span>
                  <span>{formatMemberName(member2)} gọi {formatMemberName(member1)}: <b>{relationship.title2to1}</b></span>
                </div>
              </div>

              {/* Loại lỗi */}
              <div className="report-section">
                <label>Loại lỗi (chọn ít nhất 1):</label>
                <div className="error-type-options">
                  {ERROR_TYPE_OPTIONS.map(opt => (
                    <label key={opt.value} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={reportForm.errorTypes.includes(opt.value)}
                        onChange={() => handleReportErrorType(opt.value)}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Đề xuất sửa */}
              <div className="report-section">
                <label>Đề xuất danh xưng đúng (không bắt buộc):</label>
                <div className="suggestion-inputs">
                  <input
                    type="text"
                    placeholder={`${formatMemberName(member1)} gọi ${formatMemberName(member2)} là...`}
                    value={reportForm.suggestedCorrection.title1to2}
                    onChange={e => setReportForm(prev => ({
                      ...prev,
                      suggestedCorrection: { ...prev.suggestedCorrection, title1to2: e.target.value }
                    }))}
                  />
                  <input
                    type="text"
                    placeholder={`${formatMemberName(member2)} gọi ${formatMemberName(member1)} là...`}
                    value={reportForm.suggestedCorrection.title2to1}
                    onChange={e => setReportForm(prev => ({
                      ...prev,
                      suggestedCorrection: { ...prev.suggestedCorrection, title2to1: e.target.value }
                    }))}
                  />
                </div>
              </div>

              {/* Mô tả chi tiết */}
              <div className="report-section">
                <label>Mô tả chi tiết (không bắt buộc):</label>
                <textarea
                  placeholder="Giải thích tại sao sai, ví dụ: 'Ở quê tôi gọi là...' hoặc 'Theo phả hệ gia đình tôi...'"
                  value={reportForm.description}
                  onChange={e => setReportForm(prev => ({ ...prev, description: e.target.value }))}
                  maxLength={1000}
                  rows={3}
                />
              </div>

              {/* Message */}
              {reportMessage && (
                <div className={`report-message ${reportMessage.type}`}>
                  {reportMessage.text}
                </div>
              )}
            </div>

            <div className="report-modal-footer">
              <button
                className="cancel-btn"
                onClick={() => setShowReportModal(false)}
                disabled={reportSubmitting}
              >
                Hủy
              </button>
              <button
                className="submit-btn"
                onClick={handleReportSubmit}
                disabled={reportSubmitting || reportForm.errorTypes.length === 0}
              >
                {reportSubmitting ? 'Đang gửi...' : 'Gửi báo cáo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member 2 - hiển thị title1to2 (member1 gọi member2 là gì) */}
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
          <span className="slot-title">"{selectedDialectTitles.title1to2}"</span>
        </div>
      </div>
    </>
  );
}

export default RelationshipPopup;

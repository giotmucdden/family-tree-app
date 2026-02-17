/**
 * Seed script: 5-generation Nguyen family tree demo (EXPANDED)
 *
 * James & Mary have 10 children (Robert, Susan + 8 new).
 * Each of the 8 new children has up to 4 generations of descendants.
 *
 * Showcases relationship scenarios:
 *   💚 Living married parents   – most members
 *   ✝  Deceased parent          – Gen 1 (James & Mary)
 *   🕊️  Widowed → REMARRIED     – Elizabeth (widowed from Robert) → remarried to George
 *   ⚡ Divorced → REMARRIED      – Susan divorced Richard → Susan remarried to Frank
 *                                  Richard remarried to Linda
 *   👶 Children from multiple marriages
 *
 * Run:  node seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const FamilyTree = require('./models/FamilyTree');
const FamilyMember = require('./models/FamilyMember');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // ── Clean previous demo data ──────────────────────────────
  const existingUser = await User.findOne({ facebookId: 'demo_user_001' });
  if (existingUser) {
    const trees = await FamilyTree.find({ owner: existingUser._id });
    for (const t of trees) {
      await FamilyMember.deleteMany({ familyTree: t._id });
    }
    await FamilyTree.deleteMany({ owner: existingUser._id });
    await User.deleteOne({ _id: existingUser._id });
    console.log('Cleared previous demo data');
  }

  // ── Demo user ─────────────────────────────────────────────
  const demoUser = await User.create({
    facebookId: 'demo_user_001',
    displayName: 'Demo User',
    firstName: 'Demo',
    lastName: 'User',
    email: 'demo@giapha.vn',
    profilePhoto: '',
  });

  const tree = await FamilyTree.create({
    name: 'Gia Phả Họ Nguyễn',
    description:
      'Đại gia đình 3 nhánh (James, Hùng, Lan) — 260+ thành viên qua 6 thế hệ, từ cụ Đức & cụ Thị.',
    owner: demoUser._id,
  });

  async function make(data) {
    const m = await FamilyMember.create({ ...data, familyTree: tree._id });
    tree.members.push(m._id);
    return m;
  }

  function linkSpouses(a, b, status) {
    a.spouses.push({ memberId: b._id, status });
    b.spouses.push({ memberId: a._id, status });
  }

  function linkChild(father, mother, child) {
    child.fatherId = father._id;
    child.motherId = mother._id;
    father.childrenIds.push(child._id);
    mother.childrenIds.push(child._id);
  }

  const james = await make({
    firstName: 'James',
    lastName: 'Nguyen',
    gender: 'male',
    birthDate: new Date('1920-03-15'),
    deathDate: new Date('1998-11-02'),
    isLiving: false,
    birthPlace: 'Saigon, Vietnam',
    occupation: 'Rice Farmer',
    bio: 'Patriarch of the Nguyen family. Emigrated from Vietnam in 1975.',
  });

  const mary = await make({
    firstName: 'Mary',
    lastName: 'Chen',
    gender: 'female',
    birthDate: new Date('1923-07-22'),
    deathDate: new Date('2005-01-18'),
    isLiving: false,
    birthPlace: 'Hanoi, Vietnam',
    occupation: 'Seamstress',
    bio: 'Beloved matriarch. Known for her incredible pho recipe.',
  });
  linkSpouses(james, mary, 'married');

  // ═══════════════════════════════════════════════════════════
  //  GEN 0 — Great-Great-Great-Grandparents  (DECEASED)
  //  Parents of James, Hùng, and Lan
  // ═══════════════════════════════════════════════════════════
  const duc = await make({
    firstName: 'Đức',
    lastName: 'Nguyễn',
    gender: 'male',
    birthDate: new Date('1895-06-10'),
    deathDate: new Date('1970-02-15'),
    isLiving: false,
    birthPlace: 'Huế, Vietnam',
    occupation: 'Village Elder / Scholar',
    bio: 'Patriarch of the Nguyễn clan. Respected Confucian scholar and village leader.',
  });

  const thi = await make({
    firstName: 'Thị',
    lastName: 'Trần',
    gender: 'female',
    birthDate: new Date('1898-12-01'),
    deathDate: new Date('1975-08-20'),
    isLiving: false,
    birthPlace: 'Huế, Vietnam',
    occupation: 'Herbalist / Midwife',
    bio: 'Matriarch of the family. Known healer who helped hundreds of families.',
  });
  linkSpouses(duc, thi, 'married');

  // Link James as child of Đức & Thị
  linkChild(duc, thi, james);

  // ── Sibling 1 of James: Hùng Nguyễn ──
  const hung = await make({
    firstName: 'Hùng',
    lastName: 'Nguyễn',
    gender: 'male',
    birthDate: new Date('1922-09-05'),
    deathDate: new Date('2001-04-12'),
    isLiving: false,
    birthPlace: 'Huế, Vietnam',
    occupation: 'School Principal',
    bio: 'Second son of Đức & Thị. Dedicated educator who built schools in rural Vietnam.',
  });
  linkChild(duc, thi, hung);

  const mei = await make({
    firstName: 'Mei',
    lastName: 'Wong',
    gender: 'female',
    birthDate: new Date('1925-03-18'),
    deathDate: new Date('2008-11-05'),
    isLiving: false,
    birthPlace: 'Cholon, Vietnam',
    occupation: 'School Teacher',
    bio: 'Married Hùng in 1946. They built a school together in the countryside.',
  });
  linkSpouses(hung, mei, 'married');

  // ── Sibling 2 of James: Lan Nguyễn ──
  const lan = await make({
    firstName: 'Lan',
    lastName: 'Nguyễn',
    gender: 'female',
    birthDate: new Date('1926-01-20'),
    deathDate: new Date('2010-07-03'),
    isLiving: false,
    birthPlace: 'Huế, Vietnam',
    occupation: 'Silk Merchant',
    bio: 'Youngest child of Đức & Thị. Built a successful silk trading business.',
  });
  linkChild(duc, thi, lan);

  const tan = await make({
    firstName: 'Tấn',
    lastName: 'Lê',
    gender: 'male',
    birthDate: new Date('1924-08-14'),
    deathDate: new Date('2003-12-25'),
    isLiving: false,
    birthPlace: 'Đà Nẵng, Vietnam',
    occupation: 'Shipping Captain',
    bio: 'Married Lan in 1948. Captained merchant ships along the coast of Vietnam.',
  });
  linkSpouses(lan, tan, 'married');

  await duc.save();
  await thi.save();


  // ═══════════════════════════════════════════════════════════
  //  HÙNG BRANCH — 5 children, 4 downstream generations
  // ═══════════════════════════════════════════════════════════

  // ── Hùng's Gen 2: 5 children ──

  // H-1. Bảo Nguyễn
  const bao = await make({
    firstName: 'Bảo', lastName: 'Nguyễn', gender: 'male',
    birthDate: new Date('1947-03-12'), isLiving: true,
    birthPlace: 'Huế, Vietnam', occupation: 'Retired Doctor',
    bio: 'Eldest son of Hùng & Mei. Practiced medicine for 40 years.',
  });
  linkChild(hung, mei, bao);
  const thuyBao = await make({
    firstName: 'Thúy', lastName: 'Phạm', gender: 'female',
    birthDate: new Date('1949-07-22'), isLiving: true,
    birthPlace: 'Nha Trang, Vietnam', occupation: 'Retired Nurse',
    bio: 'Married Bảo in 1970. They ran a clinic together.',
  });
  linkSpouses(bao, thuyBao, 'married');

  // H-2. Hạnh Nguyễn
  const hanh = await make({
    firstName: 'Hạnh', lastName: 'Nguyễn', gender: 'female',
    birthDate: new Date('1949-11-08'), isLiving: true,
    birthPlace: 'Huế, Vietnam', occupation: 'Retired Professor',
    bio: 'Literature professor at University of Saigon for 30 years.',
  });
  linkChild(hung, mei, hanh);
  const quang = await make({
    firstName: 'Quang', lastName: 'Trương', gender: 'male',
    birthDate: new Date('1947-05-15'), isLiving: true,
    birthPlace: 'Đà Lạt, Vietnam', occupation: 'Retired Poet',
    bio: 'Published poet. Married Hạnh in 1971.',
  });
  linkSpouses(hanh, quang, 'married');

  // H-3. Minh Nguyễn
  const minhH = await make({
    firstName: 'Minh', lastName: 'Nguyễn', gender: 'male',
    birthDate: new Date('1952-06-20'), isLiving: true,
    birthPlace: 'Saigon, Vietnam', occupation: 'Retired Banker',
    bio: 'Senior banker who helped Vietnamese immigrants with loans.',
  });
  linkChild(hung, mei, minhH);
  const lienMinh = await make({
    firstName: 'Liên', lastName: 'Đỗ', gender: 'female',
    birthDate: new Date('1954-01-30'), isLiving: true,
    birthPlace: 'Saigon, Vietnam', occupation: 'Retired Accountant',
    bio: 'Married Minh in 1975. Meticulous with numbers.',
  });
  linkSpouses(minhH, lienMinh, 'married');

  // H-4. Phượng Nguyễn
  const phuong = await make({
    firstName: 'Phượng', lastName: 'Nguyễn', gender: 'female',
    birthDate: new Date('1955-04-10'), isLiving: true,
    birthPlace: 'Saigon, Vietnam', occupation: 'Retired Chef',
    bio: 'Opened the first Vietnamese restaurant in Houston.',
  });
  linkChild(hung, mei, phuong);
  const kevinTr = await make({
    firstName: 'Kevin', lastName: 'Trần', gender: 'male',
    birthDate: new Date('1953-09-25'), isLiving: true,
    birthPlace: 'Houston, TX', occupation: 'Retired Restaurant Owner',
    bio: 'Married Phượng in 1977. Business partners for 40 years.',
  });
  linkSpouses(phuong, kevinTr, 'married');

  // H-5. Tuấn Nguyễn
  const tuanH = await make({
    firstName: 'Tuấn', lastName: 'Nguyễn', gender: 'male',
    birthDate: new Date('1958-12-03'), isLiving: true,
    birthPlace: 'Saigon, Vietnam', occupation: 'Civil Engineer',
    bio: 'Youngest son. Built bridges and roads across Texas.',
  });
  linkChild(hung, mei, tuanH);
  const sarahTuan = await make({
    firstName: 'Sarah', lastName: 'Miller', gender: 'female',
    birthDate: new Date('1960-02-14'), isLiving: true,
    birthPlace: 'Austin, TX', occupation: 'Architect',
    bio: 'Married Tuấn in 1982. Designed many buildings in Austin.',
  });
  linkSpouses(tuanH, sarahTuan, 'married');

  await hung.save();
  await mei.save();

  // ── Hùng's Gen 3: children of the 5 Gen 2 ──

  // Bảo & Thúy → Khoa, Ngọc
  const khoa = await make({
    firstName: 'Khoa', lastName: 'Nguyễn', gender: 'male',
    birthDate: new Date('1972-05-15'), isLiving: true,
    birthPlace: 'Houston, TX', occupation: 'Cardiologist',
    bio: 'Heart surgeon at Texas Medical Center.',
  });
  linkChild(bao, thuyBao, khoa);
  const amyKhoa = await make({
    firstName: 'Amy', lastName: 'Reeves', gender: 'female',
    birthDate: new Date('1974-08-20'), isLiving: true,
    birthPlace: 'Dallas, TX', occupation: 'Anesthesiologist',
    bio: 'Married Khoa in 1998.',
  });
  linkSpouses(khoa, amyKhoa, 'married');

  const ngoc = await make({
    firstName: 'Ngọc', lastName: 'Nguyễn', gender: 'female',
    birthDate: new Date('1975-10-01'), isLiving: true,
    birthPlace: 'Houston, TX', occupation: 'Pediatrician',
    bio: 'Runs a children\'s clinic.',
  });
  linkChild(bao, thuyBao, ngoc);
  const ryanNgoc = await make({
    firstName: 'Ryan', lastName: 'Cooper', gender: 'male',
    birthDate: new Date('1973-03-12'), isLiving: true,
    birthPlace: 'Houston, TX', occupation: 'Pharmacist',
    bio: 'Married Ngọc in 2000.',
  });
  linkSpouses(ngoc, ryanNgoc, 'married');

  await bao.save(); await thuyBao.save();

  // Hạnh & Quang → Thanh, Vy
  const thanh = await make({
    firstName: 'Thanh', lastName: 'Trương', gender: 'male',
    birthDate: new Date('1973-02-18'), isLiving: true,
    birthPlace: 'Saigon, Vietnam', occupation: 'Journalist',
    bio: 'Award-winning investigative journalist.',
  });
  linkChild(quang, hanh, thanh);
  const lisaThanh = await make({
    firstName: 'Lisa', lastName: 'Park', gender: 'female',
    birthDate: new Date('1975-06-10'), isLiving: true,
    birthPlace: 'Seoul, South Korea', occupation: 'Editor',
    bio: 'Married Thanh in 1999.',
  });
  linkSpouses(thanh, lisaThanh, 'married');

  const vy = await make({
    firstName: 'Vy', lastName: 'Trương', gender: 'female',
    birthDate: new Date('1976-09-22'), isLiving: true,
    birthPlace: 'Saigon, Vietnam', occupation: 'University Lecturer',
    bio: 'Teaches Vietnamese literature at UC Berkeley.',
  });
  linkChild(quang, hanh, vy);
  const danielVy = await make({
    firstName: 'Daniel', lastName: 'Brennan', gender: 'male',
    birthDate: new Date('1974-11-05'), isLiving: true,
    birthPlace: 'San Francisco, CA', occupation: 'Writer',
    bio: 'Published novelist. Married Vy in 2001.',
  });
  linkSpouses(vy, danielVy, 'married');

  await hanh.save(); await quang.save();

  // Minh & Liên → Đạt, Trang
  const dat = await make({
    firstName: 'Đạt', lastName: 'Nguyễn', gender: 'male',
    birthDate: new Date('1978-04-14'), isLiving: true,
    birthPlace: 'Houston, TX', occupation: 'Financial Analyst',
    bio: 'Works at a major investment bank.',
  });
  linkChild(minhH, lienMinh, dat);
  const emilDat = await make({
    firstName: 'Emily', lastName: 'Watson', gender: 'female',
    birthDate: new Date('1980-07-30'), isLiving: true,
    birthPlace: 'New York, NY', occupation: 'Lawyer',
    bio: 'Married Đạt in 2004.',
  });
  linkSpouses(dat, emilDat, 'married');

  const trang = await make({
    firstName: 'Trang', lastName: 'Nguyễn', gender: 'female',
    birthDate: new Date('1980-12-08'), isLiving: true,
    birthPlace: 'Houston, TX', occupation: 'Interior Designer',
    bio: 'Runs her own design studio.',
  });
  linkChild(minhH, lienMinh, trang);
  const markTrang = await make({
    firstName: 'Marcus', lastName: 'Johnson', gender: 'male',
    birthDate: new Date('1978-03-17'), isLiving: true,
    birthPlace: 'Chicago, IL', occupation: 'Contractor',
    bio: 'Married Trang in 2005.',
  });
  linkSpouses(trang, markTrang, 'married');

  await minhH.save(); await lienMinh.save();

  // Phượng & Kevin → Vinh, Mai
  const vinh = await make({
    firstName: 'Vinh', lastName: 'Trần', gender: 'male',
    birthDate: new Date('1979-06-22'), isLiving: true,
    birthPlace: 'Houston, TX', occupation: 'Software Developer',
    bio: 'Full-stack developer at a tech startup.',
  });
  linkChild(kevinTr, phuong, vinh);
  const jessVinh = await make({
    firstName: 'Jessica', lastName: 'Torres', gender: 'female',
    birthDate: new Date('1981-09-15'), isLiving: true,
    birthPlace: 'San Antonio, TX', occupation: 'UX Designer',
    bio: 'Married Vinh in 2006.',
  });
  linkSpouses(vinh, jessVinh, 'married');

  const maiPh = await make({
    firstName: 'Mai', lastName: 'Trần', gender: 'female',
    birthDate: new Date('1982-01-30'), isLiving: true,
    birthPlace: 'Houston, TX', occupation: 'Dentist',
    bio: 'Owns a dental practice in Houston.',
  });
  linkChild(kevinTr, phuong, maiPh);
  const scottMai = await make({
    firstName: 'Scott', lastName: 'Anderson', gender: 'male',
    birthDate: new Date('1980-05-12'), isLiving: true,
    birthPlace: 'Houston, TX', occupation: 'Orthodontist',
    bio: 'Married Mai in 2007.',
  });
  linkSpouses(maiPh, scottMai, 'married');

  await phuong.save(); await kevinTr.save();

  // Tuấn & Sarah → Derek, Lily
  const derekT = await make({
    firstName: 'Derek', lastName: 'Nguyễn', gender: 'male',
    birthDate: new Date('1984-03-20'), isLiving: true,
    birthPlace: 'Austin, TX', occupation: 'Civil Engineer',
    bio: 'Follows his father\'s footsteps in engineering.',
  });
  linkChild(tuanH, sarahTuan, derekT);
  const rachelD = await make({
    firstName: 'Rachel', lastName: 'Kim', gender: 'female',
    birthDate: new Date('1986-08-10'), isLiving: true,
    birthPlace: 'Austin, TX', occupation: 'Data Scientist',
    bio: 'Married Derek in 2010.',
  });
  linkSpouses(derekT, rachelD, 'married');

  const lilyT = await make({
    firstName: 'Lily', lastName: 'Nguyễn', gender: 'female',
    birthDate: new Date('1987-11-15'), isLiving: true,
    birthPlace: 'Austin, TX', occupation: 'Graphic Designer',
    bio: 'Freelance designer specializing in branding.',
  });
  linkChild(tuanH, sarahTuan, lilyT);
  const mattLily = await make({
    firstName: 'Matthew', lastName: 'Garcia', gender: 'male',
    birthDate: new Date('1985-06-22'), isLiving: true,
    birthPlace: 'San Antonio, TX', occupation: 'Teacher',
    bio: 'Married Lily in 2012.',
  });
  linkSpouses(lilyT, mattLily, 'married');

  await tuanH.save(); await sarahTuan.save();

  // ── Hùng's Gen 4: grandchildren ──

  // Khoa & Amy → Anh, Bình
  const anhK = await make({
    firstName: 'Anh', lastName: 'Nguyễn', gender: 'female',
    birthDate: new Date('2000-02-14'), isLiving: true,
    birthPlace: 'Houston, TX', occupation: 'Medical Student',
    bio: 'Following her parents into medicine.',
  });
  linkChild(khoa, amyKhoa, anhK);
  const binhK = await make({
    firstName: 'Bình', lastName: 'Nguyễn', gender: 'male',
    birthDate: new Date('2003-07-22'), isLiving: true,
    birthPlace: 'Houston, TX', occupation: 'College Student',
    bio: 'Studying biomedical engineering.',
  });
  linkChild(khoa, amyKhoa, binhK);
  await khoa.save(); await amyKhoa.save();

  // Ngọc & Ryan → Hải, Cúc
  const hai = await make({
    firstName: 'Hải', lastName: 'Cooper', gender: 'male',
    birthDate: new Date('2002-04-18'), isLiving: true,
    birthPlace: 'Houston, TX', occupation: 'College Student',
    bio: 'Pre-med student at Rice University.',
  });
  linkChild(ryanNgoc, ngoc, hai);
  const cuc = await make({
    firstName: 'Cúc', lastName: 'Cooper', gender: 'female',
    birthDate: new Date('2005-09-30'), isLiving: true,
    birthPlace: 'Houston, TX', occupation: 'High School Student',
    bio: 'Passionate about environmental science.',
  });
  linkChild(ryanNgoc, ngoc, cuc);
  await ngoc.save(); await ryanNgoc.save();

  // Thanh & Lisa → Duy, Hiền
  const duy = await make({
    firstName: 'Duy', lastName: 'Trương', gender: 'male',
    birthDate: new Date('2001-06-10'), isLiving: true,
    birthPlace: 'San Francisco, CA', occupation: 'College Student',
    bio: 'Journalism major at Columbia University.',
  });
  linkChild(thanh, lisaThanh, duy);
  const hien = await make({
    firstName: 'Hiền', lastName: 'Trương', gender: 'female',
    birthDate: new Date('2004-01-25'), isLiving: true,
    birthPlace: 'San Francisco, CA', occupation: 'High School Student',
    bio: 'Award-winning debater.',
  });
  linkChild(thanh, lisaThanh, hien);
  await thanh.save(); await lisaThanh.save();

  // Vy & Daniel → Khanh, Linh
  const khanhV = await make({
    firstName: 'Khanh', lastName: 'Brennan', gender: 'female',
    birthDate: new Date('2003-08-05'), isLiving: true,
    birthPlace: 'Berkeley, CA', occupation: 'College Student',
    bio: 'Creative writing major.',
  });
  linkChild(danielVy, vy, khanhV);
  const linhV = await make({
    firstName: 'Linh', lastName: 'Brennan', gender: 'male',
    birthDate: new Date('2006-03-15'), isLiving: true,
    birthPlace: 'Berkeley, CA', occupation: 'High School Student',
    bio: 'Aspiring filmmaker.',
  });
  linkChild(danielVy, vy, linhV);
  await vy.save(); await danielVy.save();

  // Đạt & Emily → Nam, Châu
  const namD = await make({
    firstName: 'Nam', lastName: 'Nguyễn', gender: 'male',
    birthDate: new Date('2006-10-20'), isLiving: true,
    birthPlace: 'New York, NY', occupation: 'High School Student',
    bio: 'Chess champion at his school.',
  });
  linkChild(dat, emilDat, namD);
  const chau = await make({
    firstName: 'Châu', lastName: 'Nguyễn', gender: 'female',
    birthDate: new Date('2009-04-14'), isLiving: true,
    birthPlace: 'New York, NY', occupation: 'Middle School Student',
    bio: 'Loves painting and piano.',
  });
  linkChild(dat, emilDat, chau);
  await dat.save(); await emilDat.save();

  // Trang & Marcus → Hương, Phúc
  const huong = await make({
    firstName: 'Hương', lastName: 'Johnson', gender: 'female',
    birthDate: new Date('2007-02-28'), isLiving: true,
    birthPlace: 'Houston, TX', occupation: 'High School Student',
    bio: 'Star volleyball player.',
  });
  linkChild(markTrang, trang, huong);
  const phucJ = await make({
    firstName: 'Phúc', lastName: 'Johnson', gender: 'male',
    birthDate: new Date('2010-08-12'), isLiving: true,
    birthPlace: 'Houston, TX', occupation: 'Middle School Student',
    bio: 'Loves robotics and coding.',
  });
  linkChild(markTrang, trang, phucJ);
  await trang.save(); await markTrang.save();

  // Vinh & Jessica T → Tâm, Uyên
  const tam = await make({
    firstName: 'Tâm', lastName: 'Trần', gender: 'male',
    birthDate: new Date('2008-05-10'), isLiving: true,
    birthPlace: 'Houston, TX', occupation: 'High School Student',
    bio: 'Talented guitarist.',
  });
  linkChild(vinh, jessVinh, tam);
  const uyen = await make({
    firstName: 'Uyên', lastName: 'Trần', gender: 'female',
    birthDate: new Date('2011-11-25'), isLiving: true,
    birthPlace: 'Houston, TX', occupation: 'Middle School Student',
    bio: 'Loves ballet and painting.',
  });
  linkChild(vinh, jessVinh, uyen);
  await vinh.save(); await jessVinh.save();

  // Mai & Scott → Quỳnh, Sơn
  const quynhM = await make({
    firstName: 'Quỳnh', lastName: 'Anderson', gender: 'female',
    birthDate: new Date('2009-07-15'), isLiving: true,
    birthPlace: 'Houston, TX', occupation: 'High School Student',
    bio: 'State science fair winner.',
  });
  linkChild(scottMai, maiPh, quynhM);
  const sonM = await make({
    firstName: 'Sơn', lastName: 'Anderson', gender: 'male',
    birthDate: new Date('2012-03-22'), isLiving: true,
    birthPlace: 'Houston, TX', occupation: 'Middle School Student',
    bio: 'Soccer enthusiast.',
  });
  linkChild(scottMai, maiPh, sonM);
  await maiPh.save(); await scottMai.save();

  // Derek & Rachel → Khải, Yến
  const khai = await make({
    firstName: 'Khải', lastName: 'Nguyễn', gender: 'male',
    birthDate: new Date('2012-09-05'), isLiving: true,
    birthPlace: 'Austin, TX', occupation: 'Elementary Student',
    bio: 'Loves dinosaurs and building LEGOs.',
  });
  linkChild(derekT, rachelD, khai);
  const yenD = await make({
    firstName: 'Yến', lastName: 'Nguyễn', gender: 'female',
    birthDate: new Date('2015-01-18'), isLiving: true,
    birthPlace: 'Austin, TX', occupation: 'Elementary Student',
    bio: 'Loves drawing and animals.',
  });
  linkChild(derekT, rachelD, yenD);
  await derekT.save(); await rachelD.save();

  // Lily & Matthew → Trúc, Quốc
  const truc = await make({
    firstName: 'Trúc', lastName: 'Garcia', gender: 'female',
    birthDate: new Date('2014-06-20'), isLiving: true,
    birthPlace: 'Austin, TX', occupation: 'Elementary Student',
    bio: 'Creative little artist.',
  });
  linkChild(mattLily, lilyT, truc);
  const quocG = await make({
    firstName: 'Quốc', lastName: 'Garcia', gender: 'male',
    birthDate: new Date('2017-04-10'), isLiving: true,
    birthPlace: 'Austin, TX', occupation: 'Preschool',
    bio: 'The youngest in this branch.',
  });
  linkChild(mattLily, lilyT, quocG);
  await lilyT.save(); await mattLily.save();

  // ── Hùng's Gen 5: great-grandchildren (for oldest branches) ──
  // Anh (Khoa's daughter) has a child
  const anhSpouse = await make({
    firstName: 'Tyler', lastName: 'Brooks', gender: 'male',
    birthDate: new Date('1999-11-08'), isLiving: true,
    birthPlace: 'Houston, TX', occupation: 'Resident Doctor',
    bio: 'Married Anh in 2024.',
  });
  linkSpouses(anhK, anhSpouse, 'married');
  const babyAnh = await make({
    firstName: 'Nhi', lastName: 'Brooks', gender: 'female',
    birthDate: new Date('2025-06-01'), isLiving: true,
    birthPlace: 'Houston, TX', occupation: 'Infant',
    bio: 'Newest member of the family.',
  });
  linkChild(anhSpouse, anhK, babyAnh);
  await anhK.save(); await anhSpouse.save(); await babyAnh.save();
  await binhK.save(); await hai.save(); await cuc.save();
  await duy.save(); await hien.save(); await khanhV.save(); await linhV.save();
  await namD.save(); await chau.save(); await huong.save(); await phucJ.save();
  await tam.save(); await uyen.save(); await quynhM.save(); await sonM.save();
  await khai.save(); await yenD.save(); await truc.save(); await quocG.save();

  // ═══════════════════════════════════════════════════════════
  //  LAN BRANCH — 5 children, 4 downstream generations
  // ═══════════════════════════════════════════════════════════

  // ── Lan's Gen 2: 5 children ──

  // L-1. Thắng Lê
  const thang = await make({
    firstName: 'Thắng', lastName: 'Lê', gender: 'male',
    birthDate: new Date('1950-02-14'), isLiving: true,
    birthPlace: 'Đà Nẵng, Vietnam', occupation: 'Retired Ship Engineer',
    bio: 'Eldest son. Followed his father into maritime career.',
  });
  linkChild(tan, lan, thang);
  const nganTh = await make({
    firstName: 'Ngân', lastName: 'Hoàng', gender: 'female',
    birthDate: new Date('1952-05-20'), isLiving: true,
    birthPlace: 'Huế, Vietnam', occupation: 'Retired Teacher',
    bio: 'Married Thắng in 1972.',
  });
  linkSpouses(thang, nganTh, 'married');

  // L-2. Hồng Lê
  const hong = await make({
    firstName: 'Hồng', lastName: 'Lê', gender: 'female',
    birthDate: new Date('1952-08-30'), isLiving: true,
    birthPlace: 'Đà Nẵng, Vietnam', occupation: 'Retired Silk Trader',
    bio: 'Took over mother Lan\'s silk business.',
  });
  linkChild(tan, lan, hong);
  const robertLe = await make({
    firstName: 'Robert', lastName: 'Wilson', gender: 'male',
    birthDate: new Date('1950-10-12'), isLiving: true,
    birthPlace: 'Portland, OR', occupation: 'Retired Import/Export',
    bio: 'Married Hồng in 1974. Helped expand the silk business internationally.',
  });
  linkSpouses(hong, robertLe, 'married');

  // L-3. Cường Lê
  const cuong = await make({
    firstName: 'Cường', lastName: 'Lê', gender: 'male',
    birthDate: new Date('1955-04-17'), isLiving: true,
    birthPlace: 'Đà Nẵng, Vietnam', occupation: 'Retired Navy Officer',
    bio: 'Served in the navy for 25 years.',
  });
  linkChild(tan, lan, cuong);
  const maryC = await make({
    firstName: 'Mary', lastName: 'O\'Brien', gender: 'female',
    birthDate: new Date('1957-12-08'), isLiving: true,
    birthPlace: 'Boston, MA', occupation: 'Retired Naval Nurse',
    bio: 'Met Cường at a naval base. Married in 1978.',
  });
  linkSpouses(cuong, maryC, 'married');

  // L-4. Yến Lê
  const yenLe = await make({
    firstName: 'Yến', lastName: 'Lê', gender: 'female',
    birthDate: new Date('1958-07-22'), isLiving: true,
    birthPlace: 'Saigon, Vietnam', occupation: 'Retired Florist',
    bio: 'Owned the most popular flower shop in Orange County.',
  });
  linkChild(tan, lan, yenLe);
  const tomYen = await make({
    firstName: 'Thomas', lastName: 'Chang', gender: 'male',
    birthDate: new Date('1956-03-15'), isLiving: true,
    birthPlace: 'Taipei, Taiwan', occupation: 'Retired Landscape Architect',
    bio: 'Married Yến in 1980. Together they designed beautiful gardens.',
  });
  linkSpouses(yenLe, tomYen, 'married');

  // L-5. Dũng Lê
  const dung = await make({
    firstName: 'Dũng', lastName: 'Lê', gender: 'male',
    birthDate: new Date('1961-11-05'), isLiving: true,
    birthPlace: 'Saigon, Vietnam', occupation: 'Real Estate Developer',
    bio: 'Youngest child. Built a real estate empire in Southern California.',
  });
  linkChild(tan, lan, dung);
  const lindaDung = await make({
    firstName: 'Linda', lastName: 'Nakamura', gender: 'female',
    birthDate: new Date('1963-09-18'), isLiving: true,
    birthPlace: 'Los Angeles, CA', occupation: 'Interior Architect',
    bio: 'Married Dũng in 1985.',
  });
  linkSpouses(dung, lindaDung, 'married');

  await lan.save();
  await tan.save();

  // ── Lan's Gen 3: children of the 5 Gen 2 ──

  // Thắng & Ngân → Đông, Xuân
  const dong = await make({
    firstName: 'Đông', lastName: 'Lê', gender: 'male',
    birthDate: new Date('1974-01-15'), isLiving: true,
    birthPlace: 'San Diego, CA', occupation: 'Marine Biologist',
    bio: 'Studies coral reef ecosystems.',
  });
  linkChild(thang, nganTh, dong);
  const karenDong = await make({
    firstName: 'Karen', lastName: 'Foster', gender: 'female',
    birthDate: new Date('1976-04-20'), isLiving: true,
    birthPlace: 'San Diego, CA', occupation: 'Oceanographer',
    bio: 'Married Đông in 2000.',
  });
  linkSpouses(dong, karenDong, 'married');

  const xuan = await make({
    firstName: 'Xuân', lastName: 'Lê', gender: 'female',
    birthDate: new Date('1977-06-10'), isLiving: true,
    birthPlace: 'San Diego, CA', occupation: 'Veterinarian',
    bio: 'Runs an animal rescue shelter.',
  });
  linkChild(thang, nganTh, xuan);
  const jasonXuan = await make({
    firstName: 'Jason', lastName: 'Rivera', gender: 'male',
    birthDate: new Date('1975-09-30'), isLiving: true,
    birthPlace: 'San Diego, CA', occupation: 'Firefighter',
    bio: 'Married Xuân in 2002.',
  });
  linkSpouses(xuan, jasonXuan, 'married');

  await thang.save(); await nganTh.save();

  // Hồng & Robert W → Hà, Dương
  const haLe = await make({
    firstName: 'Hà', lastName: 'Wilson', gender: 'female',
    birthDate: new Date('1976-03-25'), isLiving: true,
    birthPlace: 'Portland, OR', occupation: 'Fashion Designer',
    bio: 'Combines Vietnamese silk traditions with modern fashion.',
  });
  linkChild(robertLe, hong, haLe);
  const jamesDuong = await make({
    firstName: 'James', lastName: 'Reed', gender: 'male',
    birthDate: new Date('1974-07-12'), isLiving: true,
    birthPlace: 'Portland, OR', occupation: 'Photographer',
    bio: 'Fashion photographer. Married Hà in 2001.',
  });
  linkSpouses(haLe, jamesDuong, 'married');

  const duong = await make({
    firstName: 'Dương', lastName: 'Wilson', gender: 'male',
    birthDate: new Date('1979-11-08'), isLiving: true,
    birthPlace: 'Portland, OR', occupation: 'Web Developer',
    bio: 'Full-stack developer at a tech company.',
  });
  linkChild(robertLe, hong, duong);
  const sarahDuong = await make({
    firstName: 'Sarah', lastName: 'Walsh', gender: 'female',
    birthDate: new Date('1981-02-14'), isLiving: true,
    birthPlace: 'Seattle, WA', occupation: 'Product Manager',
    bio: 'Married Dương in 2005.',
  });
  linkSpouses(duong, sarahDuong, 'married');

  await hong.save(); await robertLe.save();

  // Cường & Mary → Long, Thu
  const longC = await make({
    firstName: 'Long', lastName: 'Lê', gender: 'male',
    birthDate: new Date('1980-05-20'), isLiving: true,
    birthPlace: 'San Diego, CA', occupation: 'Navy Pilot',
    bio: 'Third generation in the navy.',
  });
  linkChild(cuong, maryC, longC);
  const emilyLong = await make({
    firstName: 'Emily', lastName: 'Harris', gender: 'female',
    birthDate: new Date('1982-08-15'), isLiving: true,
    birthPlace: 'Virginia Beach, VA', occupation: 'Military Nurse',
    bio: 'Married Long in 2006.',
  });
  linkSpouses(longC, emilyLong, 'married');

  const thu = await make({
    firstName: 'Thu', lastName: 'Lê', gender: 'female',
    birthDate: new Date('1983-10-12'), isLiving: true,
    birthPlace: 'San Diego, CA', occupation: 'Physical Therapist',
    bio: 'Helps veterans recover from injuries.',
  });
  linkChild(cuong, maryC, thu);
  const brianThu = await make({
    firstName: 'Brian', lastName: 'Mitchell', gender: 'male',
    birthDate: new Date('1981-01-30'), isLiving: true,
    birthPlace: 'San Diego, CA', occupation: 'High School Coach',
    bio: 'Married Thu in 2008.',
  });
  linkSpouses(thu, brianThu, 'married');

  await cuong.save(); await maryC.save();

  // Yến & Thomas C → Trâm, Quân
  const tram = await make({
    firstName: 'Trâm', lastName: 'Chang', gender: 'female',
    birthDate: new Date('1982-02-28'), isLiving: true,
    birthPlace: 'Irvine, CA', occupation: 'Botanist',
    bio: 'Researches rare orchid species.',
  });
  linkChild(tomYen, yenLe, tram);
  const alexTram = await make({
    firstName: 'Alex', lastName: 'Thornton', gender: 'male',
    birthDate: new Date('1980-06-18'), isLiving: true,
    birthPlace: 'Irvine, CA', occupation: 'Horticulturist',
    bio: 'Married Trâm in 2007.',
  });
  linkSpouses(tram, alexTram, 'married');

  const quan = await make({
    firstName: 'Quân', lastName: 'Chang', gender: 'male',
    birthDate: new Date('1985-09-10'), isLiving: true,
    birthPlace: 'Irvine, CA', occupation: 'Landscape Designer',
    bio: 'Designs Japanese-inspired gardens.',
  });
  linkChild(tomYen, yenLe, quan);
  const meganQuan = await make({
    firstName: 'Megan', lastName: 'Campbell', gender: 'female',
    birthDate: new Date('1987-03-05'), isLiving: true,
    birthPlace: 'San Jose, CA', occupation: 'Art Teacher',
    bio: 'Married Quân in 2010.',
  });
  linkSpouses(quan, meganQuan, 'married');

  await yenLe.save(); await tomYen.save();

  // Dũng & Linda N → Huy, Thảo
  const huy = await make({
    firstName: 'Huy', lastName: 'Lê', gender: 'male',
    birthDate: new Date('1987-04-14'), isLiving: true,
    birthPlace: 'Los Angeles, CA', occupation: 'Real Estate Agent',
    bio: 'Continues the family real estate business.',
  });
  linkChild(dung, lindaDung, huy);
  const jenHuy = await make({
    firstName: 'Jennifer', lastName: 'Ortiz', gender: 'female',
    birthDate: new Date('1989-07-22'), isLiving: true,
    birthPlace: 'Los Angeles, CA', occupation: 'Marketing Manager',
    bio: 'Married Huy in 2013.',
  });
  linkSpouses(huy, jenHuy, 'married');

  const thao = await make({
    firstName: 'Thảo', lastName: 'Lê', gender: 'female',
    birthDate: new Date('1990-12-01'), isLiving: true,
    birthPlace: 'Los Angeles, CA', occupation: 'Architect',
    bio: 'Designs eco-friendly homes.',
  });
  linkChild(dung, lindaDung, thao);
  const adamThao = await make({
    firstName: 'Adam', lastName: 'Patel', gender: 'male',
    birthDate: new Date('1988-10-15'), isLiving: true,
    birthPlace: 'Los Angeles, CA', occupation: 'Structural Engineer',
    bio: 'Married Thảo in 2015.',
  });
  linkSpouses(thao, adamThao, 'married');

  await dung.save(); await lindaDung.save();

  // ── Lan's Gen 4: grandchildren ──

  // Đông & Karen → Sóng, Biển
  const song = await make({
    firstName: 'Sóng', lastName: 'Lê', gender: 'male',
    birthDate: new Date('2002-07-04'), isLiving: true,
    birthPlace: 'San Diego, CA', occupation: 'College Student',
    bio: 'Marine biology major, like his father.',
  });
  linkChild(dong, karenDong, song);
  const bien = await make({
    firstName: 'Biển', lastName: 'Lê', gender: 'female',
    birthDate: new Date('2005-03-18'), isLiving: true,
    birthPlace: 'San Diego, CA', occupation: 'High School Student',
    bio: 'Competitive swimmer.',
  });
  linkChild(dong, karenDong, bien);
  await dong.save(); await karenDong.save();

  // Xuân & Jason → Hoa, Lộc
  const hoaX = await make({
    firstName: 'Hoa', lastName: 'Rivera', gender: 'female',
    birthDate: new Date('2004-05-22'), isLiving: true,
    birthPlace: 'San Diego, CA', occupation: 'High School Student',
    bio: 'Loves horses and horseback riding.',
  });
  linkChild(jasonXuan, xuan, hoaX);
  const loc = await make({
    firstName: 'Lộc', lastName: 'Rivera', gender: 'male',
    birthDate: new Date('2007-11-10'), isLiving: true,
    birthPlace: 'San Diego, CA', occupation: 'Middle School Student',
    bio: 'Aspiring marine biologist.',
  });
  linkChild(jasonXuan, xuan, loc);
  await xuan.save(); await jasonXuan.save();

  // Hà & James R → Thương, Nguyệt
  const thuong = await make({
    firstName: 'Thương', lastName: 'Reed', gender: 'female',
    birthDate: new Date('2003-08-15'), isLiving: true,
    birthPlace: 'Portland, OR', occupation: 'College Student',
    bio: 'Studying fashion design at Parsons.',
  });
  linkChild(jamesDuong, haLe, thuong);
  const nguyet = await make({
    firstName: 'Nguyệt', lastName: 'Reed', gender: 'female',
    birthDate: new Date('2006-12-20'), isLiving: true,
    birthPlace: 'Portland, OR', occupation: 'High School Student',
    bio: 'Passionate about photography like her father.',
  });
  linkChild(jamesDuong, haLe, nguyet);
  await haLe.save(); await jamesDuong.save();

  // Dương & Sarah W → Phong, Vân
  const phong = await make({
    firstName: 'Phong', lastName: 'Wilson', gender: 'male',
    birthDate: new Date('2007-04-10'), isLiving: true,
    birthPlace: 'Seattle, WA', occupation: 'High School Student',
    bio: 'Coding prodigy, already building apps.',
  });
  linkChild(duong, sarahDuong, phong);
  const van = await make({
    firstName: 'Vân', lastName: 'Wilson', gender: 'female',
    birthDate: new Date('2010-09-25'), isLiving: true,
    birthPlace: 'Seattle, WA', occupation: 'Middle School Student',
    bio: 'Loves reading and creative writing.',
  });
  linkChild(duong, sarahDuong, van);
  await duong.save(); await sarahDuong.save();

  // Long & Emily → Đức (named after great-great-grandfather), Thùy
  const ducL = await make({
    firstName: 'Đức', lastName: 'Lê', gender: 'male',
    birthDate: new Date('2008-01-20'), isLiving: true,
    birthPlace: 'San Diego, CA', occupation: 'High School Student',
    bio: 'Named after the family patriarch. Loves history.',
  });
  linkChild(longC, emilyLong, ducL);
  const thuyL = await make({
    firstName: 'Thùy', lastName: 'Lê', gender: 'female',
    birthDate: new Date('2011-06-15'), isLiving: true,
    birthPlace: 'San Diego, CA', occupation: 'Middle School Student',
    bio: 'Aspiring dancer.',
  });
  linkChild(longC, emilyLong, thuyL);
  await longC.save(); await emilyLong.save();

  // Thu & Brian → Bảo (named after cousin), An
  const baoThu = await make({
    firstName: 'Bảo', lastName: 'Mitchell', gender: 'male',
    birthDate: new Date('2010-03-08'), isLiving: true,
    birthPlace: 'San Diego, CA', occupation: 'Middle School Student',
    bio: 'Star basketball player.',
  });
  linkChild(brianThu, thu, baoThu);
  const anThu = await make({
    firstName: 'An', lastName: 'Mitchell', gender: 'female',
    birthDate: new Date('2013-10-22'), isLiving: true,
    birthPlace: 'San Diego, CA', occupation: 'Elementary Student',
    bio: 'Loves music and singing.',
  });
  linkChild(brianThu, thu, anThu);
  await thu.save(); await brianThu.save();

  // Trâm & Alex → Lan (named after grandmother), Sen
  const lanTr = await make({
    firstName: 'Lan', lastName: 'Thornton', gender: 'female',
    birthDate: new Date('2009-05-05'), isLiving: true,
    birthPlace: 'Irvine, CA', occupation: 'High School Student',
    bio: 'Named after her great-grandmother. Loves botany.',
  });
  linkChild(alexTram, tram, lanTr);
  const sen = await make({
    firstName: 'Sen', lastName: 'Thornton', gender: 'male',
    birthDate: new Date('2012-08-18'), isLiving: true,
    birthPlace: 'Irvine, CA', occupation: 'Middle School Student',
    bio: 'Loves gardening and insects.',
  });
  linkChild(alexTram, tram, sen);
  await tram.save(); await alexTram.save();

  // Quân & Megan → Cầm, Kỳ
  const cam = await make({
    firstName: 'Cầm', lastName: 'Chang', gender: 'female',
    birthDate: new Date('2012-11-30'), isLiving: true,
    birthPlace: 'San Jose, CA', occupation: 'Elementary Student',
    bio: 'Named after the Vietnamese word for music.',
  });
  linkChild(quan, meganQuan, cam);
  const kyQ = await make({
    firstName: 'Kỳ', lastName: 'Chang', gender: 'male',
    birthDate: new Date('2015-07-14'), isLiving: true,
    birthPlace: 'San Jose, CA', occupation: 'Elementary Student',
    bio: 'Loves building things.',
  });
  linkChild(quan, meganQuan, kyQ);
  await quan.save(); await meganQuan.save();

  // Huy & Jennifer O → Minh, Thịnh
  const minhHuy = await make({
    firstName: 'Minh', lastName: 'Lê', gender: 'male',
    birthDate: new Date('2015-02-20'), isLiving: true,
    birthPlace: 'Los Angeles, CA', occupation: 'Elementary Student',
    bio: 'Already shows interest in architecture.',
  });
  linkChild(huy, jenHuy, minhHuy);
  const thinh = await make({
    firstName: 'Thịnh', lastName: 'Lê', gender: 'male',
    birthDate: new Date('2018-06-10'), isLiving: true,
    birthPlace: 'Los Angeles, CA', occupation: 'Preschool',
    bio: 'The family comedian.',
  });
  linkChild(huy, jenHuy, thinh);
  await huy.save(); await jenHuy.save();

  // Thảo & Adam → Trâm, Bách
  const tramThao = await make({
    firstName: 'Trâm', lastName: 'Patel', gender: 'female',
    birthDate: new Date('2017-04-25'), isLiving: true,
    birthPlace: 'Los Angeles, CA', occupation: 'Preschool',
    bio: 'Loves building with blocks.',
  });
  linkChild(adamThao, thao, tramThao);
  const bach = await make({
    firstName: 'Bách', lastName: 'Patel', gender: 'male',
    birthDate: new Date('2020-01-15'), isLiving: true,
    birthPlace: 'Los Angeles, CA', occupation: 'Toddler',
    bio: 'The youngest member of the Lan branch.',
  });
  linkChild(adamThao, thao, bach);
  await thao.save(); await adamThao.save();

  // ── Lan's Gen 5: great-grandchild for oldest branch ──
  const songSpouse = await make({
    firstName: 'Mia', lastName: 'Santos', gender: 'female',
    birthDate: new Date('2003-10-12'), isLiving: true,
    birthPlace: 'San Diego, CA', occupation: 'Marine Researcher',
    bio: 'Married Sóng in 2025.',
  });
  linkSpouses(song, songSpouse, 'married');
  const babySong = await make({
    firstName: 'Đại Dương', lastName: 'Lê', gender: 'male',
    birthDate: new Date('2026-01-10'), isLiving: true,
    birthPlace: 'San Diego, CA', occupation: 'Infant',
    bio: 'Name means "ocean" — newest member of the Lan branch.',
  });
  linkChild(song, songSpouse, babySong);
  await song.save(); await songSpouse.save(); await babySong.save();
  await bien.save(); await hoaX.save(); await loc.save();
  await thuong.save(); await nguyet.save(); await phong.save(); await van.save();
  await ducL.save(); await thuyL.save(); await baoThu.save(); await anThu.save();
  await lanTr.save(); await sen.save(); await cam.save(); await kyQ.save();
  await minhHuy.save(); await thinh.save(); await tramThao.save(); await bach.save();
  // ═══════════════════════════════════════════════════════════
  //  GEN 2 — 10 Children of James & Mary
  //  (Robert & Susan are original; 8 new siblings added)
  // ═══════════════════════════════════════════════════════════

  // ---- 1. Thomas (eldest) ----
  const thomas = await make({
    firstName: 'Thomas',
    lastName: 'Nguyen',
    gender: 'male',
    birthDate: new Date('1943-05-22'),
    isLiving: true,
    birthPlace: 'Saigon, Vietnam',
    occupation: 'Retired Army Colonel',
    bio: 'Eldest son. Served in the military for 30 years before retiring.',
  });
  linkChild(james, mary, thomas);

  const margaret = await make({
    firstName: 'Margaret',
    lastName: "O'Brien",
    gender: 'female',
    birthDate: new Date('1945-03-18'),
    isLiving: true,
    birthPlace: 'Boston, MA',
    occupation: 'Retired Librarian',
    bio: "Met Thomas at a USO event. Married in 1965.",
  });
  linkSpouses(thomas, margaret, 'married');

  // ---- 2. Robert (existing — deceased, widowed Elizabeth) ----
  const robert = await make({
    firstName: 'Robert',
    lastName: 'Nguyen',
    gender: 'male',
    birthDate: new Date('1945-05-10'),
    deathDate: new Date('2018-08-25'),
    isLiving: false,
    birthPlace: 'Saigon, Vietnam',
    occupation: 'Mechanical Engineer',
    bio: 'First in the family to earn a college degree. Passed away in 2018.',
  });
  linkChild(james, mary, robert);

  const elizabeth = await make({
    firstName: 'Elizabeth',
    lastName: 'Park',
    gender: 'female',
    birthDate: new Date('1948-09-03'),
    isLiving: true,
    birthPlace: 'Seoul, South Korea',
    occupation: 'Registered Nurse',
    bio: 'Met Robert at university. Widowed in 2018, remarried George in 2020.',
  });
  linkSpouses(robert, elizabeth, 'widowed');

  const george = await make({
    firstName: 'George',
    lastName: 'Martinez',
    gender: 'male',
    birthDate: new Date('1946-11-20'),
    isLiving: true,
    birthPlace: 'San Diego, CA',
    occupation: 'Retired Professor',
    bio: 'Married Elizabeth in 2020. A warm addition to the family.',
  });
  linkSpouses(elizabeth, george, 'married');

  // ---- 3. Catherine ----
  const catherine = await make({
    firstName: 'Catherine',
    lastName: 'Nguyen',
    gender: 'female',
    birthDate: new Date('1947-08-14'),
    isLiving: true,
    birthPlace: 'Saigon, Vietnam',
    occupation: 'Retired Pharmacist',
    bio: 'Ran the first Vietnamese-owned pharmacy in San Jose.',
  });
  linkChild(james, mary, catherine);

  const henry = await make({
    firstName: 'Henry',
    lastName: 'Lam',
    gender: 'male',
    birthDate: new Date('1945-11-30'),
    isLiving: true,
    birthPlace: 'Hong Kong',
    occupation: 'Retired Civil Engineer',
    bio: 'Built bridges across California. Married Catherine in 1968.',
  });
  linkSpouses(catherine, henry, 'married');

  // ---- 4. Susan (existing — divorced Richard, remarried Frank) ----
  const susan = await make({
    firstName: 'Susan',
    lastName: 'Nguyen',
    gender: 'female',
    birthDate: new Date('1950-12-01'),
    isLiving: true,
    birthPlace: 'Saigon, Vietnam',
    occupation: 'School Teacher',
    bio: 'Dedicated 35 years to teaching. Divorced Richard in 1990, remarried Frank in 1995.',
  });
  linkChild(james, mary, susan);

  const richard = await make({
    firstName: 'Richard',
    lastName: 'Tran',
    gender: 'male',
    birthDate: new Date('1949-06-18'),
    isLiving: true,
    birthPlace: 'Da Nang, Vietnam',
    occupation: 'Accountant',
    bio: 'Divorced Susan in 1990. Remarried Linda in 1993.',
  });
  linkSpouses(susan, richard, 'divorced');

  const frank = await make({
    firstName: 'Frank',
    lastName: 'Hoang',
    gender: 'male',
    birthDate: new Date('1951-03-08'),
    isLiving: true,
    birthPlace: 'Hue, Vietnam',
    occupation: 'Restaurant Owner',
    bio: 'Married Susan in 1995. Runs a popular Vietnamese restaurant.',
  });
  linkSpouses(susan, frank, 'married');

  const linda = await make({
    firstName: 'Linda',
    lastName: 'Vo',
    gender: 'female',
    birthDate: new Date('1955-07-14'),
    isLiving: true,
    birthPlace: 'Sacramento, CA',
    occupation: 'Real Estate Agent',
    bio: 'Married Richard in 1993. Blended family with Amy.',
  });
  linkSpouses(richard, linda, 'married');

  // ---- 5. Joseph ----
  const joseph = await make({
    firstName: 'Joseph',
    lastName: 'Nguyen',
    gender: 'male',
    birthDate: new Date('1952-04-09'),
    isLiving: true,
    birthPlace: 'Saigon, Vietnam',
    occupation: 'Retired Professor',
    bio: 'Professor of History at UC Berkeley for 30 years.',
  });
  linkChild(james, mary, joseph);

  const anna = await make({
    firstName: 'Anna',
    lastName: 'Pham',
    gender: 'female',
    birthDate: new Date('1954-06-25'),
    isLiving: true,
    birthPlace: 'Can Tho, Vietnam',
    occupation: 'Retired Pediatrician',
    bio: 'Devoted her career to child healthcare.',
  });
  linkSpouses(joseph, anna, 'married');

  // ---- 6. Rose ----
  const rose = await make({
    firstName: 'Rose',
    lastName: 'Nguyen',
    gender: 'female',
    birthDate: new Date('1954-10-17'),
    isLiving: true,
    birthPlace: 'Saigon, Vietnam',
    occupation: 'Retired Fashion Designer',
    bio: 'Founded a boutique clothing line in the 1980s.',
  });
  linkChild(james, mary, rose);

  const paul = await make({
    firstName: 'Paul',
    lastName: 'Yamamoto',
    gender: 'male',
    birthDate: new Date('1952-07-03'),
    isLiving: true,
    birthPlace: 'Tokyo, Japan',
    occupation: 'Retired Architect',
    bio: 'Designed the Nguyen family home. Married Rose in 1974.',
  });
  linkSpouses(rose, paul, 'married');

  // ---- 7. Peter ----
  const peter = await make({
    firstName: 'Peter',
    lastName: 'Nguyen',
    gender: 'male',
    birthDate: new Date('1956-01-28'),
    isLiving: true,
    birthPlace: 'Saigon, Vietnam',
    occupation: 'Retired Pilot',
    bio: 'Commercial airline pilot for 25 years. Flew over 2 million miles.',
  });
  linkChild(james, mary, peter);

  const grace = await make({
    firstName: 'Grace',
    lastName: 'Liu',
    gender: 'female',
    birthDate: new Date('1958-09-12'),
    isLiving: true,
    birthPlace: 'Taipei, Taiwan',
    occupation: 'Retired Flight Attendant',
    bio: 'Met Peter on a flight to Tokyo. Married in 1979.',
  });
  linkSpouses(peter, grace, 'married');

  // ---- 8. Teresa ----
  const teresa = await make({
    firstName: 'Teresa',
    lastName: 'Nguyen',
    gender: 'female',
    birthDate: new Date('1958-06-05'),
    isLiving: true,
    birthPlace: 'Saigon, Vietnam',
    occupation: 'Retired Judge',
    bio: 'First Vietnamese-American woman judge in Santa Clara County.',
  });
  linkChild(james, mary, teresa);

  const andrewChu = await make({
    firstName: 'Andrew',
    lastName: 'Chu',
    gender: 'male',
    birthDate: new Date('1956-12-14'),
    isLiving: true,
    birthPlace: 'San Francisco, CA',
    occupation: 'Retired Attorney',
    bio: 'Partner at a major law firm for 20 years. Married Teresa in 1980.',
  });
  linkSpouses(teresa, andrewChu, 'married');

  // ---- 9. Patrick ----
  const patrick = await make({
    firstName: 'Patrick',
    lastName: 'Nguyen',
    gender: 'male',
    birthDate: new Date('1960-03-21'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'Retired Firefighter',
    bio: 'Served the San Jose Fire Department for 28 years.',
  });
  linkChild(james, mary, patrick);

  const diana = await make({
    firstName: 'Diana',
    lastName: 'Santos',
    gender: 'female',
    birthDate: new Date('1962-08-30'),
    isLiving: true,
    birthPlace: 'Manila, Philippines',
    occupation: 'Nurse Practitioner',
    bio: 'Emigrated from the Philippines. Married Patrick in 1984.',
  });
  linkSpouses(patrick, diana, 'married');

  // ---- 10. Christina (youngest) ----
  const christina = await make({
    firstName: 'Christina',
    lastName: 'Nguyen',
    gender: 'female',
    birthDate: new Date('1963-11-08'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'Retired Music Teacher',
    bio: 'Youngest child of James & Mary. Taught piano for 30 years.',
  });
  linkChild(james, mary, christina);

  const brian = await make({
    firstName: 'Brian',
    lastName: "O'Malley",
    gender: 'male',
    birthDate: new Date('1961-05-16'),
    isLiving: true,
    birthPlace: 'Dublin, Ireland',
    occupation: 'Pub Owner',
    bio: 'Emigrated from Ireland. Married Christina in 1986. Runs a pub in San Jose.',
  });
  linkSpouses(christina, brian, 'married');

  // Save Gen 1 & Gen 2
  await james.save();
  await mary.save();

  // ═══════════════════════════════════════════════════════════
  //  GEN 3 — EXISTING: Children of Robert & Susan branches
  // ═══════════════════════════════════════════════════════════

  const william = await make({
    firstName: 'William',
    lastName: 'Nguyen',
    gender: 'male',
    birthDate: new Date('1970-02-14'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'Software Engineer',
    bio: 'Worked at major tech companies in Silicon Valley.',
  });
  linkChild(robert, elizabeth, william);

  const patricia = await make({
    firstName: 'Patricia',
    lastName: 'Kim',
    gender: 'female',
    birthDate: new Date('1972-06-20'),
    isLiving: true,
    birthPlace: 'Los Angeles, CA',
    occupation: 'Architect',
    bio: 'Designed several award-winning buildings in California.',
  });
  linkSpouses(william, patricia, 'married');

  const david = await make({
    firstName: 'David',
    lastName: 'Nguyen',
    gender: 'male',
    birthDate: new Date('1973-11-08'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'Dentist',
    bio: 'Runs a family dental practice in Santa Clara.',
  });
  linkChild(robert, elizabeth, david);

  const jennifer = await make({
    firstName: 'Jennifer',
    lastName: 'Lee',
    gender: 'female',
    birthDate: new Date('1975-04-17'),
    isLiving: true,
    birthPlace: 'San Francisco, CA',
    occupation: 'Marketing Director',
    bio: 'Leads marketing at a major consumer brand.',
  });
  linkSpouses(david, jennifer, 'married');

  const helen = await make({
    firstName: 'Helen',
    lastName: 'Nguyen',
    gender: 'female',
    birthDate: new Date('1976-08-30'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'Pharmacist',
    bio: 'Community pharmacist for over 20 years.',
  });
  linkChild(robert, elizabeth, helen);

  await robert.save();
  await elizabeth.save();

  const amy = await make({
    firstName: 'Amy',
    lastName: 'Tran',
    gender: 'female',
    birthDate: new Date('1978-03-22'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'Civil Engineer',
    bio: 'Born before parents divorced. Close with both Susan and Richard.',
  });
  linkChild(richard, susan, amy);

  const tommy = await make({
    firstName: 'Tommy',
    lastName: 'Diaz',
    gender: 'male',
    birthDate: new Date('1976-09-11'),
    isLiving: true,
    birthPlace: 'Phoenix, AZ',
    occupation: 'Firefighter',
    bio: 'Married Amy in 2005. Devoted family man.',
  });
  linkSpouses(amy, tommy, 'married');

  const nathan = await make({
    firstName: 'Nathan',
    lastName: 'Hoang',
    gender: 'male',
    birthDate: new Date('1997-08-15'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'Graphic Designer',
    bio: 'Born to Susan and Frank after their marriage. Half-sibling to Amy.',
  });
  linkChild(frank, susan, nathan);

  const jessica = await make({
    firstName: 'Jessica',
    lastName: 'Tran',
    gender: 'female',
    birthDate: new Date('1995-05-20'),
    isLiving: true,
    birthPlace: 'Sacramento, CA',
    occupation: 'Veterinarian',
    bio: 'Born to Richard and Linda. Half-sibling to Amy.',
  });
  linkChild(richard, linda, jessica);

  const markChen = await make({
    firstName: 'Mark',
    lastName: 'Chen',
    gender: 'male',
    birthDate: new Date('1993-01-12'),
    isLiving: true,
    birthPlace: 'Oakland, CA',
    occupation: 'Chef',
    bio: 'Married Jessica in 2020. Passionate about fusion cuisine.',
  });
  linkSpouses(jessica, markChen, 'married');

  await susan.save();
  await richard.save();
  await frank.save();
  await linda.save();

  // ═══════════════════════════════════════════════════════════
  //  GEN 3 — NEW: Children of the 8 new siblings
  // ═══════════════════════════════════════════════════════════

  // ── Branch 1: Thomas & Margaret's children ──
  const philip = await make({
    firstName: 'Philip',
    lastName: 'Nguyen',
    gender: 'male',
    birthDate: new Date('1968-02-10'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'Orthopedic Surgeon',
    bio: 'Chief of surgery at a regional hospital.',
  });
  linkChild(thomas, margaret, philip);

  const sandraKim = await make({
    firstName: 'Sandra',
    lastName: 'Kim',
    gender: 'female',
    birthDate: new Date('1970-05-22'),
    isLiving: true,
    birthPlace: 'Los Angeles, CA',
    occupation: 'Hospital Administrator',
    bio: 'Met Philip during medical residency.',
  });
  linkSpouses(philip, sandraKim, 'married');

  const dianeNguyen = await make({
    firstName: 'Diane',
    lastName: 'Nguyen',
    gender: 'female',
    birthDate: new Date('1972-09-15'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'Journalist',
    bio: 'Award-winning investigative reporter.',
  });
  linkChild(thomas, margaret, dianeNguyen);

  const rogerHall = await make({
    firstName: 'Roger',
    lastName: 'Hall',
    gender: 'male',
    birthDate: new Date('1970-04-08'),
    isLiving: true,
    birthPlace: 'Portland, OR',
    occupation: 'TV Producer',
    bio: 'Met Diane while working on a documentary.',
  });
  linkSpouses(dianeNguyen, rogerHall, 'married');

  await thomas.save();
  await margaret.save();

  // ── Branch 2: Catherine & Henry's children ──
  const steven = await make({
    firstName: 'Steven',
    lastName: 'Lam',
    gender: 'male',
    birthDate: new Date('1970-03-28'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'Investment Banker',
    bio: 'Managing director at a top financial firm.',
  });
  linkChild(henry, catherine, steven);

  const karenWu = await make({
    firstName: 'Karen',
    lastName: 'Wu',
    gender: 'female',
    birthDate: new Date('1972-07-15'),
    isLiving: true,
    birthPlace: 'Shanghai, China',
    occupation: 'Corporate Lawyer',
    bio: 'Partner at a major international law firm.',
  });
  linkSpouses(steven, karenWu, 'married');

  const michelle = await make({
    firstName: 'Michelle',
    lastName: 'Lam',
    gender: 'female',
    birthDate: new Date('1974-12-09'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'Interior Designer',
    bio: 'Runs a successful design studio in San Francisco.',
  });
  linkChild(henry, catherine, michelle);

  const jasonRivera = await make({
    firstName: 'Jason',
    lastName: 'Rivera',
    gender: 'male',
    birthDate: new Date('1972-08-22'),
    isLiving: true,
    birthPlace: 'Miami, FL',
    occupation: 'Restaurant Chain Owner',
    bio: 'Owns 5 restaurants across the Bay Area.',
  });
  linkSpouses(michelle, jasonRivera, 'married');

  await catherine.save();
  await henry.save();

  // ── Branch 3: Joseph & Anna's children ──
  const christopher = await make({
    firstName: 'Christopher',
    lastName: 'Nguyen',
    gender: 'male',
    birthDate: new Date('1977-06-12'),
    isLiving: true,
    birthPlace: 'Berkeley, CA',
    occupation: 'Environmental Scientist',
    bio: 'Works on climate change research at a national lab.',
  });
  linkChild(joseph, anna, christopher);

  const lauraChen = await make({
    firstName: 'Laura',
    lastName: 'Chen',
    gender: 'female',
    birthDate: new Date('1979-10-28'),
    isLiving: true,
    birthPlace: 'San Diego, CA',
    occupation: 'Marine Biologist',
    bio: 'Studies coral reef ecosystems in the Pacific.',
  });
  linkSpouses(christopher, lauraChen, 'married');

  const stephanieN = await make({
    firstName: 'Stephanie',
    lastName: 'Nguyen',
    gender: 'female',
    birthDate: new Date('1980-01-20'),
    isLiving: true,
    birthPlace: 'Berkeley, CA',
    occupation: 'Psychologist',
    bio: 'Specializes in family therapy and child psychology.',
  });
  linkChild(joseph, anna, stephanieN);

  const marcusBennett = await make({
    firstName: 'Marcus',
    lastName: 'Bennett',
    gender: 'male',
    birthDate: new Date('1978-08-05'),
    isLiving: true,
    birthPlace: 'Atlanta, GA',
    occupation: 'High School Principal',
    bio: 'Passionate about education reform.',
  });
  linkSpouses(stephanieN, marcusBennett, 'married');

  await joseph.save();
  await anna.save();

  // ── Branch 4: Rose & Paul's children ──
  const kenneth = await make({
    firstName: 'Kenneth',
    lastName: 'Yamamoto',
    gender: 'male',
    birthDate: new Date('1976-04-17'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'Aerospace Engineer',
    bio: 'Works on satellite systems at NASA JPL.',
  });
  linkChild(paul, rose, kenneth);

  const rebeccaTorres = await make({
    firstName: 'Rebecca',
    lastName: 'Torres',
    gender: 'female',
    birthDate: new Date('1978-11-25'),
    isLiving: true,
    birthPlace: 'Albuquerque, NM',
    occupation: 'Astrophysicist',
    bio: 'Researches dark matter at Caltech.',
  });
  linkSpouses(kenneth, rebeccaTorres, 'married');

  const samantha = await make({
    firstName: 'Samantha',
    lastName: 'Yamamoto',
    gender: 'female',
    birthDate: new Date('1979-08-03'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'Cardiologist',
    bio: 'Leads the cardiology department at Stanford Hospital.',
  });
  linkChild(paul, rose, samantha);

  const vinodPatel = await make({
    firstName: 'Vinod',
    lastName: 'Patel',
    gender: 'male',
    birthDate: new Date('1977-02-14'),
    isLiving: true,
    birthPlace: 'Mumbai, India',
    occupation: 'Biotech CEO',
    bio: 'Founded a biotech startup focused on gene therapy.',
  });
  linkSpouses(samantha, vinodPatel, 'married');

  await rose.save();
  await paul.save();

  // ── Branch 5: Peter & Grace's children ──
  const raymond = await make({
    firstName: 'Raymond',
    lastName: 'Nguyen',
    gender: 'male',
    birthDate: new Date('1980-07-04'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'Airline Captain',
    bio: 'Followed his father into aviation. Captains 787 Dreamliners.',
  });
  linkChild(peter, grace, raymond);

  const heatherBrooks = await make({
    firstName: 'Heather',
    lastName: 'Brooks',
    gender: 'female',
    birthDate: new Date('1982-01-15'),
    isLiving: true,
    birthPlace: 'Denver, CO',
    occupation: 'Physical Therapist',
    bio: 'Specializes in sports rehabilitation.',
  });
  linkSpouses(raymond, heatherBrooks, 'married');

  const christineN = await make({
    firstName: 'Christine',
    lastName: 'Nguyen',
    gender: 'female',
    birthDate: new Date('1983-11-28'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'Veterinary Surgeon',
    bio: 'Runs an emergency animal hospital.',
  });
  linkChild(peter, grace, christineN);

  const samuelOkafor = await make({
    firstName: 'Samuel',
    lastName: 'Okafor',
    gender: 'male',
    birthDate: new Date('1981-06-20'),
    isLiving: true,
    birthPlace: 'Lagos, Nigeria',
    occupation: 'Neurosurgeon',
    bio: 'Emigrated from Nigeria. One of the top neurosurgeons in the Bay Area.',
  });
  linkSpouses(christineN, samuelOkafor, 'married');

  await peter.save();
  await grace.save();

  // ── Branch 6: Teresa & Andrew Chu's children ──
  const derekChu = await make({
    firstName: 'Derek',
    lastName: 'Chu',
    gender: 'male',
    birthDate: new Date('1982-05-18'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'Tech Startup Founder',
    bio: 'Founded an AI company that was acquired by a major tech firm.',
  });
  linkChild(andrewChu, teresa, derekChu);

  const vanessaLee = await make({
    firstName: 'Vanessa',
    lastName: 'Lee',
    gender: 'female',
    birthDate: new Date('1984-09-23'),
    isLiving: true,
    birthPlace: 'Seoul, South Korea',
    occupation: 'Venture Capitalist',
    bio: 'Partner at a leading Silicon Valley VC firm.',
  });
  linkSpouses(derekChu, vanessaLee, 'married');

  const monicaChu = await make({
    firstName: 'Monica',
    lastName: 'Chu',
    gender: 'female',
    birthDate: new Date('1985-02-07'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'Surgeon',
    bio: 'Specializes in minimally invasive surgery.',
  });
  linkChild(andrewChu, teresa, monicaChu);

  const ryanTanaka = await make({
    firstName: 'Ryan',
    lastName: 'Tanaka',
    gender: 'male',
    birthDate: new Date('1983-11-30'),
    isLiving: true,
    birthPlace: 'Honolulu, HI',
    occupation: 'Orthopedic Surgeon',
    bio: 'Former college basketball player turned surgeon.',
  });
  linkSpouses(monicaChu, ryanTanaka, 'married');

  await teresa.save();
  await andrewChu.save();

  // ── Branch 7: Patrick & Diana's children ──
  const gabriel = await make({
    firstName: 'Gabriel',
    lastName: 'Nguyen',
    gender: 'male',
    birthDate: new Date('1985-03-14'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'Emergency Room Doctor',
    bio: 'Inspired by his father to serve the community.',
  });
  linkChild(patrick, diana, gabriel);

  const yukiMori = await make({
    firstName: 'Yuki',
    lastName: 'Mori',
    gender: 'female',
    birthDate: new Date('1987-06-22'),
    isLiving: true,
    birthPlace: 'Osaka, Japan',
    occupation: 'Pediatric Nurse',
    bio: 'Met Gabriel during a medical mission trip to Japan.',
  });
  linkSpouses(gabriel, yukiMori, 'married');

  const valentina = await make({
    firstName: 'Valentina',
    lastName: 'Nguyen',
    gender: 'female',
    birthDate: new Date('1988-10-09'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'Fashion Designer',
    bio: 'Inherited her aunt Rose\'s talent for design.',
  });
  linkChild(patrick, diana, valentina);

  const connorWalsh = await make({
    firstName: 'Connor',
    lastName: 'Walsh',
    gender: 'male',
    birthDate: new Date('1986-07-28'),
    isLiving: true,
    birthPlace: 'Chicago, IL',
    occupation: 'Sports Agent',
    bio: 'Represents several professional athletes.',
  });
  linkSpouses(valentina, connorWalsh, 'married');

  await patrick.save();
  await diana.save();

  // ── Branch 8: Christina & Brian's children ──
  const seanOM = await make({
    firstName: 'Sean',
    lastName: "O'Malley",
    gender: 'male',
    birthDate: new Date('1987-04-12'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'Music Producer',
    bio: 'Inherited his mother\'s musical talent. Grammy-nominated producer.',
  });
  linkChild(brian, christina, seanOM);

  const fionaByrne = await make({
    firstName: 'Fiona',
    lastName: 'Byrne',
    gender: 'female',
    birthDate: new Date('1989-08-05'),
    isLiving: true,
    birthPlace: 'Cork, Ireland',
    occupation: 'Singer-Songwriter',
    bio: 'Met Sean at a music festival in Dublin.',
  });
  linkSpouses(seanOM, fionaByrne, 'married');

  const siennaOM = await make({
    firstName: 'Sienna',
    lastName: "O'Malley",
    gender: 'female',
    birthDate: new Date('1990-01-30'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'Yoga Instructor & Wellness Coach',
    bio: 'Runs a popular wellness studio.',
  });
  linkChild(brian, christina, siennaOM);

  const nolanHarper = await make({
    firstName: 'Nolan',
    lastName: 'Harper',
    gender: 'male',
    birthDate: new Date('1988-12-18'),
    isLiving: true,
    birthPlace: 'Nashville, TN',
    occupation: 'Country Music Artist',
    bio: 'Has 3 platinum albums. Married Sienna in 2014.',
  });
  linkSpouses(siennaOM, nolanHarper, 'married');

  await christina.save();
  await brian.save();

  // ═══════════════════════════════════════════════════════════
  //  GEN 4 — EXISTING: Children of Robert/Susan branches
  // ═══════════════════════════════════════════════════════════

  const michael = await make({
    firstName: 'Michael',
    lastName: 'Nguyen',
    gender: 'male',
    birthDate: new Date('1995-01-25'),
    isLiving: true,
    birthPlace: 'Santa Clara, CA',
    occupation: 'Hardware Engineer',
    email: 'michael.nguyen@email.com',
    bio: 'Works on next-gen chip design at a top tech company.',
  });
  linkChild(william, patricia, michael);

  const sarah = await make({
    firstName: 'Sarah',
    lastName: 'Johnson',
    gender: 'female',
    birthDate: new Date('1996-08-12'),
    isLiving: true,
    birthPlace: 'Austin, TX',
    occupation: 'Pediatrician',
    email: 'sarah.johnson@email.com',
    bio: 'Specializes in childhood development.',
  });
  linkSpouses(michael, sarah, 'married');

  const emily = await make({
    firstName: 'Emily',
    lastName: 'Nguyen',
    gender: 'female',
    birthDate: new Date('1998-04-05'),
    isLiving: true,
    birthPlace: 'Santa Clara, CA',
    occupation: 'UX Designer',
    email: 'emily.nguyen@email.com',
    bio: 'Passionate about accessible design and user research.',
  });
  linkChild(william, patricia, emily);

  await william.save();
  await patricia.save();

  const daniel = await make({
    firstName: 'Daniel',
    lastName: 'Nguyen',
    gender: 'male',
    birthDate: new Date('1997-10-30'),
    isLiving: true,
    birthPlace: 'Santa Clara, CA',
    occupation: 'Data Scientist',
    email: 'daniel.nguyen@email.com',
    bio: 'Applies ML to healthcare data analytics.',
  });
  linkChild(david, jennifer, daniel);

  const lisaWang = await make({
    firstName: 'Lisa',
    lastName: 'Wang',
    gender: 'female',
    birthDate: new Date('1998-03-22'),
    isLiving: true,
    birthPlace: 'Seattle, WA',
    occupation: 'Product Manager',
    email: 'lisa.wang@email.com',
    bio: 'Leads product strategy at a growing startup.',
  });
  linkSpouses(daniel, lisaWang, 'married');

  const kevin = await make({
    firstName: 'Kevin',
    lastName: 'Nguyen',
    gender: 'male',
    birthDate: new Date('2000-07-14'),
    isLiving: true,
    birthPlace: 'Santa Clara, CA',
    occupation: 'Graduate Student',
    email: 'kevin.nguyen@email.com',
    bio: 'Pursuing a PhD in Biomedical Engineering at Stanford.',
  });
  linkChild(david, jennifer, kevin);

  await david.save();
  await jennifer.save();

  const jake = await make({
    firstName: 'Jake',
    lastName: 'Diaz',
    gender: 'male',
    birthDate: new Date('2006-11-05'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'High School Student',
    bio: 'Star of the soccer team.',
  });
  linkChild(tommy, amy, jake);

  await tommy.save();
  await amy.save();

  // ═══════════════════════════════════════════════════════════
  //  GEN 4 — NEW: Grandchildren of the 8 new siblings
  // ═══════════════════════════════════════════════════════════

  // ── Branch 1: Philip & Sandra's children ──
  const justinN = await make({
    firstName: 'Justin',
    lastName: 'Nguyen',
    gender: 'male',
    birthDate: new Date('1993-07-18'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'Surgeon',
    bio: 'Following in his father\'s footsteps in medicine.',
  });
  linkChild(philip, sandraKim, justinN);

  const meganScott = await make({
    firstName: 'Megan',
    lastName: 'Scott',
    gender: 'female',
    birthDate: new Date('1995-01-25'),
    isLiving: true,
    birthPlace: 'Portland, OR',
    occupation: 'Registered Nurse',
    bio: 'Works alongside Justin at the same hospital.',
  });
  linkSpouses(justinN, meganScott, 'married');

  const natalieN = await make({
    firstName: 'Natalie',
    lastName: 'Nguyen',
    gender: 'female',
    birthDate: new Date('1996-11-03'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'Art Gallery Owner',
    bio: 'Curates contemporary Asian-American art.',
  });
  linkChild(philip, sandraKim, natalieN);

  // ── Diane & Roger's children ──
  const brandonHall = await make({
    firstName: 'Brandon',
    lastName: 'Hall',
    gender: 'male',
    birthDate: new Date('1995-06-20'),
    isLiving: true,
    birthPlace: 'Portland, OR',
    occupation: 'Documentary Filmmaker',
    bio: 'Award-winning filmmaker like his parents.',
  });
  linkChild(rogerHall, dianeNguyen, brandonHall);

  const alyssaChoi = await make({
    firstName: 'Alyssa',
    lastName: 'Choi',
    gender: 'female',
    birthDate: new Date('1997-03-14'),
    isLiving: true,
    birthPlace: 'Seattle, WA',
    occupation: 'Film Editor',
    bio: 'Met Brandon on a film set.',
  });
  linkSpouses(brandonHall, alyssaChoi, 'married');

  await philip.save();
  await sandraKim.save();
  await dianeNguyen.save();
  await rogerHall.save();

  // ── Branch 2: Steven & Karen's children ──
  const tiffanyLam = await make({
    firstName: 'Tiffany',
    lastName: 'Lam',
    gender: 'female',
    birthDate: new Date('1997-05-14'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'Financial Analyst',
    bio: 'Works at a top Wall Street firm.',
  });
  linkChild(steven, karenWu, tiffanyLam);

  const derekMoon = await make({
    firstName: 'Derek',
    lastName: 'Moon',
    gender: 'male',
    birthDate: new Date('1995-10-30'),
    isLiving: true,
    birthPlace: 'New York, NY',
    occupation: 'Hedge Fund Manager',
    bio: 'Power couple in the finance world with Tiffany.',
  });
  linkSpouses(tiffanyLam, derekMoon, 'married');

  const brandonLam = await make({
    firstName: 'Brandon',
    lastName: 'Lam',
    gender: 'male',
    birthDate: new Date('2000-02-18'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'Medical Student',
    bio: 'Studying medicine at UCSF.',
  });
  linkChild(steven, karenWu, brandonLam);

  // ── Michelle & Jason's children ──
  const carlosRivera = await make({
    firstName: 'Carlos',
    lastName: 'Rivera',
    gender: 'male',
    birthDate: new Date('1998-09-05'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'Executive Chef',
    bio: 'Runs his father\'s flagship restaurant.',
  });
  linkChild(jasonRivera, michelle, carlosRivera);

  const priyaSharma = await make({
    firstName: 'Priya',
    lastName: 'Sharma',
    gender: 'female',
    birthDate: new Date('1999-11-20'),
    isLiving: true,
    birthPlace: 'New Delhi, India',
    occupation: 'Food Critic & Blogger',
    bio: 'Met Carlos at a culinary competition.',
  });
  linkSpouses(carlosRivera, priyaSharma, 'married');

  await steven.save();
  await karenWu.save();
  await michelle.save();
  await jasonRivera.save();

  // ── Branch 3: Christopher & Laura's children ──
  const alexN = await make({
    firstName: 'Alex',
    lastName: 'Nguyen',
    gender: 'male',
    birthDate: new Date('2002-03-30'),
    isLiving: true,
    birthPlace: 'Berkeley, CA',
    occupation: 'Graduate Student',
    bio: 'Studying marine biology at Scripps Institution.',
  });
  linkChild(christopher, lauraChen, alexN);

  const zoeAdams = await make({
    firstName: 'Zoe',
    lastName: 'Adams',
    gender: 'female',
    birthDate: new Date('2003-07-15'),
    isLiving: true,
    birthPlace: 'Santa Barbara, CA',
    occupation: 'Graduate Student',
    bio: 'Childhood sweethearts with Alex. Also studying marine science.',
  });
  linkSpouses(alexN, zoeAdams, 'married');

  const bellaN = await make({
    firstName: 'Bella',
    lastName: 'Nguyen',
    gender: 'female',
    birthDate: new Date('2005-12-18'),
    isLiving: true,
    birthPlace: 'Berkeley, CA',
    occupation: 'College Student',
    bio: 'Pre-med at UCLA.',
  });
  linkChild(christopher, lauraChen, bellaN);

  // ── Stephanie & Marcus's children ──
  const jordanBennett = await make({
    firstName: 'Jordan',
    lastName: 'Bennett',
    gender: 'male',
    birthDate: new Date('2004-05-22'),
    isLiving: true,
    birthPlace: 'Berkeley, CA',
    occupation: 'College Student',
    bio: 'Studying psychology at Stanford.',
  });
  linkChild(marcusBennett, stephanieN, jordanBennett);

  const taylorBennett = await make({
    firstName: 'Taylor',
    lastName: 'Bennett',
    gender: 'female',
    birthDate: new Date('2007-08-11'),
    isLiving: true,
    birthPlace: 'Berkeley, CA',
    occupation: 'High School Student',
    bio: 'Star of the debate team.',
  });
  linkChild(marcusBennett, stephanieN, taylorBennett);

  await christopher.save();
  await lauraChen.save();
  await stephanieN.save();
  await marcusBennett.save();

  // ── Branch 4: Kenneth & Rebecca's children ──
  const hannahY = await make({
    firstName: 'Hannah',
    lastName: 'Yamamoto',
    gender: 'female',
    birthDate: new Date('2001-06-28'),
    isLiving: true,
    birthPlace: 'Pasadena, CA',
    occupation: 'Aerospace Engineer',
    bio: 'Following her father into space engineering at SpaceX.',
  });
  linkChild(kenneth, rebeccaTorres, hannahY);

  const noahClarke = await make({
    firstName: 'Noah',
    lastName: 'Clarke',
    gender: 'male',
    birthDate: new Date('2000-03-09'),
    isLiving: true,
    birthPlace: 'Houston, TX',
    occupation: 'NASA Flight Controller',
    bio: 'Works in Mission Control at Johnson Space Center.',
  });
  linkSpouses(hannahY, noahClarke, 'married');

  const aidenY = await make({
    firstName: 'Aiden',
    lastName: 'Yamamoto',
    gender: 'male',
    birthDate: new Date('2004-10-15'),
    isLiving: true,
    birthPlace: 'Pasadena, CA',
    occupation: 'College Student',
    bio: 'Studying astrophysics at MIT.',
  });
  linkChild(kenneth, rebeccaTorres, aidenY);

  // ── Samantha & Vinod's children ──
  const raviPatel = await make({
    firstName: 'Ravi',
    lastName: 'Patel',
    gender: 'male',
    birthDate: new Date('2003-01-22'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'Biotech Researcher',
    bio: 'Works at his father\'s biotech company.',
  });
  linkChild(vinodPatel, samantha, raviPatel);

  const emmaSullivan = await make({
    firstName: 'Emma',
    lastName: 'Sullivan',
    gender: 'female',
    birthDate: new Date('2004-05-11'),
    isLiving: true,
    birthPlace: 'Boston, MA',
    occupation: 'Genetic Counselor',
    bio: 'Met Ravi at a biotech conference.',
  });
  linkSpouses(raviPatel, emmaSullivan, 'married');

  await kenneth.save();
  await rebeccaTorres.save();
  await samantha.save();
  await vinodPatel.save();

  // ── Branch 5: Raymond & Heather's children ──
  const tylerN = await make({
    firstName: 'Tyler',
    lastName: 'Nguyen',
    gender: 'male',
    birthDate: new Date('2005-03-17'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'College Student',
    bio: 'Studying aviation at Embry-Riddle. Wants to be a pilot like his dad and grandpa.',
  });
  linkChild(raymond, heatherBrooks, tylerN);

  const madisonN = await make({
    firstName: 'Madison',
    lastName: 'Nguyen',
    gender: 'female',
    birthDate: new Date('2007-11-22'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'High School Student',
    bio: 'Aspiring physical therapist like her mom.',
  });
  linkChild(raymond, heatherBrooks, madisonN);

  // ── Christine & Samuel's children ──
  const zaraOkafor = await make({
    firstName: 'Zara',
    lastName: 'Okafor',
    gender: 'female',
    birthDate: new Date('2003-05-10'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'Medical Student',
    bio: 'Studying neuroscience at Johns Hopkins.',
  });
  linkChild(samuelOkafor, christineN, zaraOkafor);

  const isaacWong = await make({
    firstName: 'Isaac',
    lastName: 'Wong',
    gender: 'male',
    birthDate: new Date('2001-09-14'),
    isLiving: true,
    birthPlace: 'San Francisco, CA',
    occupation: 'Neuroscience Researcher',
    bio: 'Childhood friends with Zara, now married.',
  });
  linkSpouses(zaraOkafor, isaacWong, 'married');

  await raymond.save();
  await heatherBrooks.save();
  await christineN.save();
  await samuelOkafor.save();

  // ── Branch 6: Derek Chu & Vanessa's children ──
  const jasmineChu = await make({
    firstName: 'Jasmine',
    lastName: 'Chu',
    gender: 'female',
    birthDate: new Date('2006-07-12'),
    isLiving: true,
    birthPlace: 'Palo Alto, CA',
    occupation: 'College Student',
    bio: 'Studying computer science at Stanford.',
  });
  linkChild(derekChu, vanessaLee, jasmineChu);

  const dylanChu = await make({
    firstName: 'Dylan',
    lastName: 'Chu',
    gender: 'male',
    birthDate: new Date('2009-01-25'),
    isLiving: true,
    birthPlace: 'Palo Alto, CA',
    occupation: 'High School Student',
    bio: 'Robotics team captain.',
  });
  linkChild(derekChu, vanessaLee, dylanChu);

  // ── Monica & Ryan Tanaka's children ──
  const haileyTanaka = await make({
    firstName: 'Hailey',
    lastName: 'Tanaka',
    gender: 'female',
    birthDate: new Date('2007-10-08'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'College Student',
    bio: 'Pre-med student at UC Berkeley.',
  });
  linkChild(ryanTanaka, monicaChu, haileyTanaka);

  const lucasTanaka = await make({
    firstName: 'Lucas',
    lastName: 'Tanaka',
    gender: 'male',
    birthDate: new Date('2010-06-18'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'High School Student',
    bio: 'Passionate about basketball and coding.',
  });
  linkChild(ryanTanaka, monicaChu, lucasTanaka);

  await derekChu.save();
  await vanessaLee.save();
  await monicaChu.save();
  await ryanTanaka.save();

  // ── Branch 7: Gabriel & Yuki's children ──
  const mateoN = await make({
    firstName: 'Mateo',
    lastName: 'Nguyen',
    gender: 'male',
    birthDate: new Date('2010-04-05'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'High School Student',
    bio: 'Bilingual in Japanese and English. Loves martial arts.',
  });
  linkChild(gabriel, yukiMori, mateoN);

  const sofiaN = await make({
    firstName: 'Sofia',
    lastName: 'Nguyen',
    gender: 'female',
    birthDate: new Date('2013-08-18'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'Middle School Student',
    bio: 'Talented pianist. Takes after grandma Christina.',
  });
  linkChild(gabriel, yukiMori, sofiaN);

  // ── Valentina & Connor's children ──
  const liamWalsh = await make({
    firstName: 'Liam',
    lastName: 'Walsh',
    gender: 'male',
    birthDate: new Date('2012-01-30'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'Middle School Student',
    bio: 'Star athlete. Plays baseball and soccer.',
  });
  linkChild(connorWalsh, valentina, liamWalsh);

  const ellaWalsh = await make({
    firstName: 'Ella',
    lastName: 'Walsh',
    gender: 'female',
    birthDate: new Date('2015-05-20'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'Elementary School Student',
    bio: 'Loves fashion design like her mom Valentina.',
  });
  linkChild(connorWalsh, valentina, ellaWalsh);

  await gabriel.save();
  await yukiMori.save();
  await valentina.save();
  await connorWalsh.save();

  // ── Branch 8: Sean & Fiona's children ──
  const kaiOM = await make({
    firstName: 'Kai',
    lastName: "O'Malley",
    gender: 'male',
    birthDate: new Date('2012-09-08'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'Middle School Student',
    bio: 'Already plays guitar and drums. Musical prodigy.',
  });
  linkChild(seanOM, fionaByrne, kaiOM);

  const lunaOM = await make({
    firstName: 'Luna',
    lastName: "O'Malley",
    gender: 'female',
    birthDate: new Date('2015-03-22'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'Elementary School Student',
    bio: 'Has a beautiful singing voice like her mom Fiona.',
  });
  linkChild(seanOM, fionaByrne, lunaOM);

  // ── Sienna & Nolan's children ──
  const declanHarper = await make({
    firstName: 'Declan',
    lastName: 'Harper',
    gender: 'male',
    birthDate: new Date('2014-11-05'),
    isLiving: true,
    birthPlace: 'Nashville, TN',
    occupation: 'Middle School Student',
    bio: 'Learning guitar from his dad Nolan.',
  });
  linkChild(nolanHarper, siennaOM, declanHarper);

  const ivyHarper = await make({
    firstName: 'Ivy',
    lastName: 'Harper',
    gender: 'female',
    birthDate: new Date('2017-07-14'),
    isLiving: true,
    birthPlace: 'Nashville, TN',
    occupation: 'Elementary School Student',
    bio: 'Loves yoga with mom and music with dad.',
  });
  linkChild(nolanHarper, siennaOM, ivyHarper);

  await seanOM.save();
  await fionaByrne.save();
  await siennaOM.save();
  await nolanHarper.save();

  // ═══════════════════════════════════════════════════════════
  //  GEN 5 — EXISTING: Children of Robert/Susan branches
  // ═══════════════════════════════════════════════════════════

  const ethan = await make({
    firstName: 'Ethan',
    lastName: 'Nguyen',
    gender: 'male',
    birthDate: new Date('2022-03-18'),
    isLiving: true,
    birthPlace: 'Santa Clara, CA',
    bio: 'The newest little explorer of the family!',
  });
  linkChild(michael, sarah, ethan);

  const olivia = await make({
    firstName: 'Olivia',
    lastName: 'Nguyen',
    gender: 'female',
    birthDate: new Date('2024-09-07'),
    isLiving: true,
    birthPlace: 'Santa Clara, CA',
    bio: "The baby of the family - everyone's favorite!",
  });
  linkChild(michael, sarah, olivia);

  await michael.save();
  await sarah.save();

  const sophia = await make({
    firstName: 'Sophia',
    lastName: 'Nguyen',
    gender: 'female',
    birthDate: new Date('2023-06-15'),
    isLiving: true,
    birthPlace: 'Seattle, WA',
    bio: "Named after her great-grandmother's middle name.",
  });
  linkChild(daniel, lisaWang, sophia);

  const lucas = await make({
    firstName: 'Lucas',
    lastName: 'Nguyen',
    gender: 'male',
    birthDate: new Date('2025-01-10'),
    isLiving: true,
    birthPlace: 'Santa Clara, CA',
    bio: 'The youngest member of the Nguyen family!',
  });
  linkChild(daniel, lisaWang, lucas);

  await daniel.save();
  await lisaWang.save();

  const mia = await make({
    firstName: 'Mia',
    lastName: 'Chen',
    gender: 'female',
    birthDate: new Date('2023-12-01'),
    isLiving: true,
    birthPlace: 'Oakland, CA',
    bio: 'Jessica and Mark\'s first child.',
  });
  linkChild(markChen, jessica, mia);

  const lily = await make({
    firstName: 'Lily',
    lastName: 'Martinez',
    gender: 'female',
    birthDate: new Date('2021-05-10'),
    isLiving: true,
    birthPlace: 'San Diego, CA',
    occupation: 'Kindergartener',
    bio: 'Daughter of Elizabeth and George.',
  });
  linkChild(george, elizabeth, lily);

  await markChen.save();
  await jessica.save();
  await nathan.save();
  await helen.save();
  await george.save();
  await elizabeth.save();

  // ═══════════════════════════════════════════════════════════
  //  GEN 5 — NEW: Great-grandchildren of the 8 new siblings
  // ═══════════════════════════════════════════════════════════

  // ── Branch 1: Justin & Megan's child ──
  const owenN = await make({
    firstName: 'Owen',
    lastName: 'Nguyen',
    gender: 'male',
    birthDate: new Date('2020-08-12'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    bio: 'Loves building Legos and playing with his cousin Harper.',
  });
  linkChild(justinN, meganScott, owenN);

  // ── Branch 1: Brandon Hall & Alyssa's child ──
  const harperHall = await make({
    firstName: 'Harper',
    lastName: 'Hall',
    gender: 'female',
    birthDate: new Date('2022-04-30'),
    isLiving: true,
    birthPlace: 'Portland, OR',
    bio: 'Already loves cameras and storytelling.',
  });
  linkChild(brandonHall, alyssaChoi, harperHall);

  await justinN.save();
  await meganScott.save();
  await brandonHall.save();
  await alyssaChoi.save();
  await natalieN.save();

  // ── Branch 2: Tiffany & Derek Moon's child ──
  const leoMoon = await make({
    firstName: 'Leo',
    lastName: 'Moon',
    gender: 'male',
    birthDate: new Date('2023-01-08'),
    isLiving: true,
    birthPlace: 'New York, NY',
    bio: 'Named after his great-grandfather Henry.',
  });
  linkChild(derekMoon, tiffanyLam, leoMoon);

  // ── Branch 2: Carlos & Priya's child ──
  const mayaRivera = await make({
    firstName: 'Maya',
    lastName: 'Rivera',
    gender: 'female',
    birthDate: new Date('2025-06-15'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    bio: 'The newest addition to the Rivera-Sharma family.',
  });
  linkChild(carlosRivera, priyaSharma, mayaRivera);

  await tiffanyLam.save();
  await derekMoon.save();
  await brandonLam.save();
  await carlosRivera.save();
  await priyaSharma.save();

  // ── Branch 3: Alex & Zoe's child ──
  const chloeN = await make({
    firstName: 'Chloe',
    lastName: 'Nguyen',
    gender: 'female',
    birthDate: new Date('2025-09-01'),
    isLiving: true,
    birthPlace: 'San Diego, CA',
    bio: 'Born near the ocean, just like her marine biologist parents dreamed.',
  });
  linkChild(alexN, zoeAdams, chloeN);

  await alexN.save();
  await zoeAdams.save();
  await bellaN.save();
  await jordanBennett.save();
  await taylorBennett.save();

  // ── Branch 4: Hannah & Noah's child ──
  const ariaClarke = await make({
    firstName: 'Aria',
    lastName: 'Clarke',
    gender: 'female',
    birthDate: new Date('2024-11-20'),
    isLiving: true,
    birthPlace: 'Houston, TX',
    bio: 'Born in Houston near NASA. Parents joke she\'ll be an astronaut.',
  });
  linkChild(noahClarke, hannahY, ariaClarke);

  // ── Branch 4: Ravi & Emma's child ──
  const niaPatel = await make({
    firstName: 'Nia',
    lastName: 'Patel',
    gender: 'female',
    birthDate: new Date('2026-01-15'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    bio: 'The newest baby in the Patel family.',
  });
  linkChild(raviPatel, emmaSullivan, niaPatel);

  await hannahY.save();
  await noahClarke.save();
  await aidenY.save();
  await raviPatel.save();
  await emmaSullivan.save();

  // ── Branch 5: Zara & Isaac's child ──
  const nadiaWong = await make({
    firstName: 'Nadia',
    lastName: 'Wong',
    gender: 'female',
    birthDate: new Date('2025-03-20'),
    isLiving: true,
    birthPlace: 'Baltimore, MD',
    bio: 'Born while her parents were at Johns Hopkins.',
  });
  linkChild(isaacWong, zaraOkafor, nadiaWong);

  await zaraOkafor.save();
  await isaacWong.save();
  await tylerN.save();
  await madisonN.save();

  // Save remaining Gen 4 without Gen 5 children
  await jasmineChu.save();
  await dylanChu.save();
  await haileyTanaka.save();
  await lucasTanaka.save();
  await mateoN.save();
  await sofiaN.save();
  await liamWalsh.save();
  await ellaWalsh.save();
  await kaiOM.save();
  await lunaOM.save();
  await declanHarper.save();
  await ivyHarper.save();

  // Save Gen 5
  await ethan.save();
  await olivia.save();
  await sophia.save();
  await lucas.save();
  await mia.save();
  await lily.save();
  await owenN.save();
  await harperHall.save();
  await leoMoon.save();
  await mayaRivera.save();
  await chloeN.save();
  await ariaClarke.save();
  await niaPatel.save();
  await nadiaWong.save();
  await jake.save();
  await kevin.save();
  await emily.save();

  // ═══════════════════════════════════════════════════════════
  //  ELIZABETH PARK'S SIDE — Hidden from the Nguyen root view
  // ═══════════════════════════════════════════════════════════

  const joonho = await make({
    firstName: 'Joon-ho',
    lastName: 'Park',
    gender: 'male',
    birthDate: new Date('1900-04-12'),
    deathDate: new Date('1978-06-01'),
    isLiving: false,
    birthPlace: 'Busan, South Korea',
    occupation: 'Fisherman',
    bio: 'Elizabeth\'s paternal grandfather.',
  });

  const soojin = await make({
    firstName: 'Soo-jin',
    lastName: 'Lee',
    gender: 'female',
    birthDate: new Date('1903-11-28'),
    deathDate: new Date('1985-03-15'),
    isLiving: false,
    birthPlace: 'Busan, South Korea',
    occupation: 'Homemaker',
    bio: 'Elizabeth\'s paternal grandmother.',
  });
  linkSpouses(joonho, soojin, 'married');

  const sanghoon = await make({
    firstName: 'Sang-hoon',
    lastName: 'Park',
    gender: 'male',
    birthDate: new Date('1925-08-05'),
    deathDate: new Date('2010-12-20'),
    isLiving: false,
    birthPlace: 'Busan, South Korea',
    occupation: 'School Principal',
    bio: 'Elizabeth\'s father.',
  });
  linkChild(joonho, soojin, sanghoon);

  const miyoung = await make({
    firstName: 'Mi-young',
    lastName: 'Kim',
    gender: 'female',
    birthDate: new Date('1928-02-14'),
    deathDate: new Date('2015-07-08'),
    isLiving: false,
    birthPlace: 'Seoul, South Korea',
    occupation: 'Calligrapher',
    bio: 'Elizabeth\'s mother.',
  });
  linkSpouses(sanghoon, miyoung, 'married');

  elizabeth.fatherId = sanghoon._id;
  elizabeth.motherId = miyoung._id;
  sanghoon.childrenIds.push(elizabeth._id);
  miyoung.childrenIds.push(elizabeth._id);

  const junseo = await make({
    firstName: 'Jun-seo',
    lastName: 'Park',
    gender: 'male',
    birthDate: new Date('1952-06-17'),
    isLiving: true,
    birthPlace: 'Seoul, South Korea',
    occupation: 'Retired Doctor',
    bio: 'Elizabeth\'s older brother.',
  });
  linkChild(sanghoon, miyoung, junseo);

  const hana = await make({
    firstName: 'Hana',
    lastName: 'Yoon',
    gender: 'female',
    birthDate: new Date('1954-03-22'),
    isLiving: true,
    birthPlace: 'Incheon, South Korea',
    occupation: 'Retired Librarian',
    bio: 'Jun-seo\'s wife.',
  });
  linkSpouses(junseo, hana, 'married');

  const yuna = await make({
    firstName: 'Yuna',
    lastName: 'Park',
    gender: 'female',
    birthDate: new Date('1980-09-10'),
    isLiving: true,
    birthPlace: 'Los Angeles, CA',
    occupation: 'Journalist',
    bio: 'Elizabeth\'s niece. Award-winning reporter.',
  });
  linkChild(junseo, hana, yuna);

  const minho = await make({
    firstName: 'Min-ho',
    lastName: 'Park',
    gender: 'male',
    birthDate: new Date('1983-12-01'),
    isLiving: true,
    birthPlace: 'Los Angeles, CA',
    occupation: 'Architect',
    bio: 'Elizabeth\'s nephew. Designs sustainable buildings.',
  });
  linkChild(junseo, hana, minho);

  const sora = await make({
    firstName: 'Sora',
    lastName: 'Park',
    gender: 'female',
    birthDate: new Date('2010-04-15'),
    isLiving: true,
    birthPlace: 'Los Angeles, CA',
    occupation: 'Middle School Student',
    bio: 'Yuna\'s daughter. Loves painting and piano.',
  });
  yuna.childrenIds.push(sora._id);
  sora.motherId = yuna._id;

  await joonho.save();
  await soojin.save();
  await sanghoon.save();
  await miyoung.save();
  await elizabeth.save();
  await junseo.save();
  await hana.save();
  await yuna.save();
  await minho.save();
  await sora.save();

  // ── Set root & save tree ──────────────────────────────────
  tree.rootMember = duc._id;
  await tree.save();

  demoUser.familyTrees.push(tree._id);
  await demoUser.save();

  // ── Summary ───────────────────────────────────────────────
  const total = await FamilyMember.countDocuments({ familyTree: tree._id });

  console.log('\n  ✅ Gia phả đã tạo thành công!');
  console.log('================================================================');
  console.log(`  Tên:        ${tree.name}`);
  console.log(`  Thành viên: ${total}`);
  console.log('');
  console.log('  ── GEN 0 — Cụ Đức & Cụ Thị ──────────────────────────');
  console.log('  Đức Nguyễn [1895-1970] --- Thị Trần [1898-1975]');
  console.log('  3 con: James, Hùng, Lan');
  console.log('');
  console.log('  ── NHÁNH 1: JAMES & MARY (10 con) ────────────────────');
  console.log('  Gen 1  James [deceased] --- Mary [deceased]');
  console.log('    Thomas, Robert†, Catherine, Susan, Joseph,');
  console.log('    Rose, Peter, Teresa, Patrick, Christina');
  console.log('  + 8 nhánh con mở rộng + Park Side (Elizabeth)');
  console.log('');
  console.log('  ── NHÁNH 2: HÙNG & MEI (5 con) ──────────────────────');
  console.log('  Gen 1  Hùng Nguyễn [1922-2001] --- Mei Wong [1925-2008]');
  console.log('    Bảo, Hạnh, Minh, Phượng, Tuấn');
  console.log('  + 10 cháu + 20 chắt + 1 chút');
  console.log('');
  console.log('  ── NHÁNH 3: LAN & TẤN (5 con) ───────────────────────');
  console.log('  Gen 1  Lan Nguyễn [1926-2010] --- Tấn Lê [1924-2003]');
  console.log('    Thắng, Hồng, Cường, Yến, Dũng');
  console.log('  + 10 cháu + 20 chắt + 1 chút');
  console.log('================================================================');
  console.log('  Demo User ID:', demoUser._id.toString());
  console.log('\n  Mở http://localhost:3000 -> "Xem Gia Phả" để khám phá!\n');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});

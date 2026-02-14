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
    email: 'demo@familytree.app',
    profilePhoto: '',
  });

  const tree = await FamilyTree.create({
    name: 'The Nguyen Family',
    description:
      'Large family tree with 10 children, divorced-remarried, widowed-remarried, and 120+ members across 5+ generations.',
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

  // ═══════════════════════════════════════════════════════════
  //  GEN 1 — Great-Great-Grandparents  (DECEASED)
  // ═══════════════════════════════════════════════════════════
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
  tree.rootMember = james._id;
  await tree.save();

  demoUser.familyTrees.push(tree._id);
  await demoUser.save();

  // ── Summary ───────────────────────────────────────────────
  const total = await FamilyMember.countDocuments({ familyTree: tree._id });

  console.log('\n  Demo family tree seeded successfully!');
  console.log('================================================================');
  console.log(`  Tree:     ${tree.name}`);
  console.log(`  Members:  ${total}`);
  console.log('');
  console.log('  ── JAMES & MARY\'S 10 CHILDREN ─────────────────────────');
  console.log('  Gen 1  James [deceased] --- Mary [deceased]');
  console.log('  Gen 2  (10 children):');
  console.log('    1. Thomas --- Margaret O\'Brien');
  console.log('    2. Robert [deceased] --[widowed]-- Elizabeth → remarried George');
  console.log('    3. Catherine --- Henry Lam');
  console.log('    4. Susan --[divorced]-- Richard → Susan remarried Frank, Richard remarried Linda');
  console.log('    5. Joseph --- Anna Pham');
  console.log('    6. Rose --- Paul Yamamoto');
  console.log('    7. Peter --- Grace Liu');
  console.log('    8. Teresa --- Andrew Chu');
  console.log('    9. Patrick --- Diana Santos');
  console.log('   10. Christina --- Brian O\'Malley');
  console.log('');
  console.log('  ── 8 NEW FAMILY BRANCHES ──────────────────────────────');
  console.log('  Branch 1 (Thomas): Philip→Justin→Owen | Diane→Brandon→Harper');
  console.log('  Branch 2 (Catherine): Steven→Tiffany→Leo | Michelle→Carlos→Maya');
  console.log('  Branch 3 (Joseph): Christopher→Alex→Chloe | Stephanie→Jordan,Taylor');
  console.log('  Branch 4 (Rose): Kenneth→Hannah→Aria | Samantha→Ravi→Nia');
  console.log('  Branch 5 (Peter): Raymond→Tyler,Madison | Christine→Zara→Nadia');
  console.log('  Branch 6 (Teresa): Derek→Jasmine,Dylan | Monica→Hailey,Lucas');
  console.log('  Branch 7 (Patrick): Gabriel→Mateo,Sofia | Valentina→Liam,Ella');
  console.log('  Branch 8 (Christina): Sean→Kai,Luna | Sienna→Declan,Ivy');
  console.log('');
  console.log('  ── ORIGINAL BRANCHES (Robert & Susan) ─────────────────');
  console.log('  Robert branch: William→Michael→Ethan,Olivia | David→Daniel→Sophia,Lucas | Helen | Lily');
  console.log('  Susan branch:  Amy→Jake | Nathan | Jessica→Mia');
  console.log('');
  console.log('  ── PARK SIDE (Elizabeth\'s family) ─────────────────────');
  console.log('  Joon-ho → Sang-hoon → Elizabeth, Jun-seo → Yuna→Sora, Min-ho');
  console.log('================================================================');
  console.log('  Demo User ID:', demoUser._id.toString());
  console.log('\n  Open http://localhost:3000 -> "Try Demo" to explore!\n');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});

/**
 * Seed script: 5-generation Nguyen family tree demo
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
      'Five generations with married, divorced-remarried, and widowed-remarried scenarios.',
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
  //  GEN 2 — Great-Grandparents
  //  Robert (deceased) & Elizabeth (widowed) → Elizabeth REMARRIED George
  //  Susan & Richard (DIVORCED) → Susan REMARRIED Frank, Richard REMARRIED Linda
  // ═══════════════════════════════════════════════════════════

  // ---- Robert & Elizabeth  (Robert deceased → widowed) ----
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

  // ---- Elizabeth REMARRIES George (widowed→remarried scenario) ----
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

  // ---- Susan & Richard  (DIVORCED) ----
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

  // ---- Susan REMARRIES Frank (divorced→remarried) ----
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

  // ---- Richard REMARRIES Linda (divorced→remarried) ----
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

  // Save Gen 1 & Gen 2
  await james.save();
  await mary.save();

  // ═══════════════════════════════════════════════════════════
  //  GEN 3 — Grandparents
  //  Children of Robert & Elizabeth (widowed couple):
  //    William & Patricia (married), David & Jennifer (married), Helen (single)
  //  Child of Susan & Richard (BEFORE divorce):
  //    Amy & Tommy (married)
  //  Child of Susan & Frank (AFTER remarriage):
  //    Nathan (single) - shows child from 2nd marriage
  //  Child of Richard & Linda (AFTER remarriage):
  //    Jessica & Mark (married) - shows child from 2nd marriage
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

  // ---- Amy — child of Susan & Richard (BEFORE their divorce) ----
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

  // ---- Nathan — child of Susan & Frank (AFTER Susan remarried) ----
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

  // ---- Jessica — child of Richard & Linda (AFTER Richard remarried) ----
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

  const mark = await make({
    firstName: 'Mark',
    lastName: 'Chen',
    gender: 'male',
    birthDate: new Date('1993-01-12'),
    isLiving: true,
    birthPlace: 'Oakland, CA',
    occupation: 'Chef',
    bio: 'Married Jessica in 2020. Passionate about fusion cuisine.',
  });
  linkSpouses(jessica, mark, 'married');

  await susan.save();
  await richard.save();
  await frank.save();
  await linda.save();

  // ═══════════════════════════════════════════════════════════
  //  GEN 4 — Parents
  //  Michael & Sarah (married) — children of William & Patricia
  //  Emily (single) — child of William & Patricia
  //  Daniel & Lisa (married) — children of David & Jennifer
  //  Kevin (grad student) — child of David & Jennifer
  //  Jake — child of Amy & Tommy
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
  await michael.save();
  await emily.save();

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

  const lisa = await make({
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
  linkSpouses(daniel, lisa, 'married');

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
  await daniel.save();
  await kevin.save();

  // ---- Jake — child of Amy & Tommy ----
  const jake = await make({
    firstName: 'Jake',
    lastName: 'Diaz',
    gender: 'male',
    birthDate: new Date('2006-11-05'),
    isLiving: true,
    birthPlace: 'San Jose, CA',
    occupation: 'High School Student',
    bio: 'Star of the soccer team. Grandparents Susan and Richard are divorced.',
  });
  linkChild(tommy, amy, jake);

  await tommy.save();
  await amy.save();
  await jake.save();

  // ═══════════════════════════════════════════════════════════
  //  GEN 5 — Current generation (youngest)
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
  await ethan.save();
  await olivia.save();

  const sophia = await make({
    firstName: 'Sophia',
    lastName: 'Nguyen',
    gender: 'female',
    birthDate: new Date('2023-06-15'),
    isLiving: true,
    birthPlace: 'Seattle, WA',
    bio: "Named after her great-grandmother's middle name.",
  });
  linkChild(daniel, lisa, sophia);

  const lucas = await make({
    firstName: 'Lucas',
    lastName: 'Nguyen',
    gender: 'male',
    birthDate: new Date('2025-01-10'),
    isLiving: true,
    birthPlace: 'Santa Clara, CA',
    bio: 'The youngest member of the Nguyen family!',
  });
  linkChild(daniel, lisa, lucas);

  await daniel.save();
  await lisa.save();
  await sophia.save();
  await lucas.save();

  // ---- Child of Jessica & Mark (Richard's 2nd marriage grandchild) ----
  const mia = await make({
    firstName: 'Mia',
    lastName: 'Chen',
    gender: 'female',
    birthDate: new Date('2023-12-01'),
    isLiving: true,
    birthPlace: 'Oakland, CA',
    bio: 'Jessica and Mark\'s first child. Richard\'s granddaughter from his 2nd marriage.',
  });
  linkChild(mark, jessica, mia);

  // ---- Lily — child of Elizabeth & George (widowed→remarried child) ----
  const lily = await make({
    firstName: 'Lily',
    lastName: 'Martinez',
    gender: 'female',
    birthDate: new Date('2021-05-10'),
    isLiving: true,
    birthPlace: 'San Diego, CA',
    occupation: 'Kindergartener',
    bio: 'Daughter of Elizabeth and George. A cheerful addition to the family.',
  });
  linkChild(george, elizabeth, lily);

  await mark.save();
  await jessica.save();
  await mia.save();
  await nathan.save();
  await helen.save();
  await george.save();
  await elizabeth.save();
  await lily.save();

  // ═══════════════════════════════════════════════════════════
  //  ELIZABETH PARK'S SIDE — Hidden from the Nguyen root view
  //  2 generations up + 1 sibling downstream (with family)
  //  Visible only when you "explore" from Elizabeth's card
  // ═══════════════════════════════════════════════════════════

  // ── Park Gen 0 — Elizabeth's Grandparents ──────────────────
  const joonho = await make({
    firstName: 'Joon-ho',
    lastName: 'Park',
    gender: 'male',
    birthDate: new Date('1900-04-12'),
    deathDate: new Date('1978-06-01'),
    isLiving: false,
    birthPlace: 'Busan, South Korea',
    occupation: 'Fisherman',
    bio: 'Elizabeth\'s paternal grandfather. Lived through the Korean War.',
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
    bio: 'Elizabeth\'s paternal grandmother. Known for her kimchi recipe.',
  });
  linkSpouses(joonho, soojin, 'married');

  // ── Park Gen 1 — Elizabeth's Parents ───────────────────────
  const sanghoon = await make({
    firstName: 'Sang-hoon',
    lastName: 'Park',
    gender: 'male',
    birthDate: new Date('1925-08-05'),
    deathDate: new Date('2010-12-20'),
    isLiving: false,
    birthPlace: 'Busan, South Korea',
    occupation: 'School Principal',
    bio: 'Elizabeth\'s father. Valued education above all.',
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
    bio: 'Elizabeth\'s mother. Emigrated to the US in 1960.',
  });
  linkSpouses(sanghoon, miyoung, 'married');

  // Link Elizabeth to her parents
  elizabeth.fatherId = sanghoon._id;
  elizabeth.motherId = miyoung._id;
  sanghoon.childrenIds.push(elizabeth._id);
  miyoung.childrenIds.push(elizabeth._id);

  // ── Park Gen 2 — Elizabeth's Brother ───────────────────────
  const junseo = await make({
    firstName: 'Jun-seo',
    lastName: 'Park',
    gender: 'male',
    birthDate: new Date('1952-06-17'),
    isLiving: true,
    birthPlace: 'Seoul, South Korea',
    occupation: 'Retired Doctor',
    bio: 'Elizabeth\'s older brother. Retired cardiologist.',
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
    bio: 'Jun-seo\'s wife. Moved to the US in 1980.',
  });
  linkSpouses(junseo, hana, 'married');

  // ── Park Gen 3 — Jun-seo & Hana's Children ────────────────
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

  // ── Park Gen 4 — Yuna's child (downstream) ────────────────
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

  // Save all Park-side members
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
  console.log('  ── NGUYEN SIDE (root: James) ──────────────────────────');
  console.log('  Gen 1  James [deceased] --- Mary [deceased]           (both DECEASED)');
  console.log('  Gen 2  Robert [deceased] --[widowed]-- Elizabeth');
  console.log('         Elizabeth --[married]-- George                  (WIDOWED -> REMARRIED)');
  console.log('         Susan --[divorced]-- Richard                    (DIVORCED)');
  console.log('         Susan --[married]-- Frank                      (DIVORCED -> REMARRIED)');
  console.log('         Richard --[married]-- Linda                    (DIVORCED -> REMARRIED)');
  console.log('  Gen 3  William --- Patricia  (children of Robert & Elizabeth)');
  console.log('         David --- Jennifer    (children of Robert & Elizabeth)');
  console.log('         Helen (single)        (child of Robert & Elizabeth)');
  console.log('         Lily                  (child of Elizabeth & George, REMARRIED)');
  console.log('         Amy --- Tommy         (child of Susan & Richard, BEFORE divorce)');
  console.log('         Nathan (single)       (child of Susan & Frank, AFTER remarriage)');
  console.log('         Jessica --- Mark      (child of Richard & Linda, AFTER remarriage)');
  console.log('  Gen 4  Michael --- Sarah | Emily | Daniel --- Lisa | Kevin | Jake');
  console.log('  Gen 5  Ethan | Olivia | Sophia | Lucas | Mia');
  console.log('');
  console.log('  ── PARK SIDE (Elizabeth\'s family, explore from her card) ──');
  console.log('  PGen 0  Joon-ho Park --- Soo-jin Lee    (Elizabeth\'s grandparents)');
  console.log('  PGen 1  Sang-hoon Park --- Mi-young Kim  (Elizabeth\'s parents)');
  console.log('  PGen 2  Elizabeth Park | Jun-seo Park --- Hana Yoon (sibling)');
  console.log('  PGen 3  Yuna Park | Min-ho Park          (Jun-seo\'s children)');
  console.log('  PGen 4  Sora Park                        (Yuna\'s daughter)');
  console.log('');
  console.log('  SCENARIOS COVERED:');
  console.log('    Living married        -> William & Patricia -> Michael/Emily');
  console.log('    Deceased parents      -> James & Mary -> Robert/Susan');
  console.log('    Widowed + Remarried   -> Elizabeth widowed from Robert, remarried George');
  console.log('    Child from remarriage -> Lily (Elizabeth & George)');
  console.log('    Divorced + Remarried  -> Susan divorced Richard, remarried Frank -> Nathan');
  console.log('                          -> Richard divorced Susan, remarried Linda -> Jessica');
  console.log('    Children from 1st     -> Amy (Susan & Richard)');
  console.log('    Children from 2nd     -> Nathan (Susan & Frank), Jessica (Richard & Linda)');
  console.log('    Explore other side    -> Elizabeth\'s Park family (hidden from Nguyen root)');
  console.log('================================================================');
  console.log('  Demo User ID:', demoUser._id.toString());
  console.log('\n  Open http://localhost:3000 -> "Try Demo" to explore!\n');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});

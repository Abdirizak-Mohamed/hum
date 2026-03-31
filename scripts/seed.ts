/**
 * Seed script — populates the hum-core SQLite database with realistic test data.
 * Run with: pnpm seed  (or: tsx src/scripts/seed.ts)
 */

import {
  createDb,
  clientRepo,
  brandProfileRepo,
  socialAccountRepo,
  contentItemRepo,
  portalUserRepo,
  intakeSubmissionRepo,
} from 'hum-core';
import bcrypt from 'bcryptjs';

async function seed() {
  const { db } = await createDb();

  console.log('🌱  Running seed...\n');

  // ─────────────────────────────────────────────
  // 1. Clients
  // ─────────────────────────────────────────────
  const alisKebabs = await clientRepo.create(db, {
    businessName: "Ali's Kebabs",
    email: 'ali@aliskebabs.co.uk',
    address: '14 Manningham Lane, Bradford, BD8 7JF',
    phone: '01274 555 001',
    planTier: 'growth',
    status: 'active',
  });

  const dragonPalace = await clientRepo.create(db, {
    businessName: 'Dragon Palace',
    email: 'info@dragonpalace.co.uk',
    address: '32 Briggate, Leeds, LS1 6HR',
    phone: '0113 555 002',
    planTier: 'premium',
    status: 'active',
  });

  const tonysPizza = await clientRepo.create(db, {
    businessName: "Tony's Pizza",
    email: 'tony@tonyspizza.co.uk',
    address: '88 Deansgate, Manchester, M3 2GW',
    phone: '0161 555 003',
    planTier: 'starter',
    status: 'active',
  });

  const spiceHouse = await clientRepo.create(db, {
    businessName: 'Spice House',
    email: 'hello@spicehouse.co.uk',
    address: '5 Broad Street, Birmingham, B1 2HE',
    phone: '0121 555 004',
    planTier: 'growth',
    status: 'onboarding',
  });

  const noodleBar = await clientRepo.create(db, {
    businessName: 'Noodle Bar 88',
    email: 'noodlebar88@gmail.com',
    address: '22 Fargate, Sheffield, S1 2HE',
    phone: '0114 555 005',
    planTier: 'starter',
    status: 'paused',
  });

  console.log('Clients created:', [
    alisKebabs.businessName,
    dragonPalace.businessName,
    tonysPizza.businessName,
    spiceHouse.businessName,
    noodleBar.businessName,
  ]);

  // ─────────────────────────────────────────────
  // 2. Brand Profiles (first 3 clients)
  // ─────────────────────────────────────────────
  await brandProfileRepo.create(db, {
    clientId: alisKebabs.id,
    brandVoiceGuide:
      "Warm, down-to-earth, and proudly Bradford. Ali's tone is friendly and a little cheeky — like a mate who happens to make the best kebabs in Yorkshire. Keep it short, punchy, and full of personality.",
    keySellingPoints: [
      'Voted #1 kebab in Bradford 3 years running',
      'Halal-certified, 100% fresh-cut meat every morning',
      'Free chilli sauce and garlic mayo with every order',
      'Open until 4 am on weekends',
    ],
    contentThemes: ['food photography', 'behind the scenes', 'customer shoutouts', 'late-night vibes'],
    hashtagStrategy: [
      '#aliskebabs',
      '#bradfordfood',
      '#halalfood',
      '#kebablovers',
      '#yorkshireeats',
      '#latenightbites',
    ],
    peakPostingTimes: {
      monday: ['12:00', '20:00'],
      friday: ['12:00', '22:00'],
      saturday: ['13:00', '23:00'],
      sunday: ['13:00', '21:00'],
    },
    menuItems: [
      { name: 'Lamb Doner Wrap', description: 'Freshly carved lamb with salad and sauce in a warm flatbread', category: 'Wraps', price: 5.99 },
      { name: 'Mixed Grill Platter', description: 'Lamb chops, chicken tikka, seekh kebab and naan', category: 'Platters', price: 14.99 },
      { name: 'Peri Peri Chicken Box', description: 'Quarter chicken, fries, and coleslaw', category: 'Boxes', price: 7.49 },
      { name: 'Cheese & Chilli Fries', description: 'Crispy fries topped with melted cheese and fresh chillies', category: 'Sides', price: 3.99 },
    ],
  });

  await brandProfileRepo.create(db, {
    clientId: dragonPalace.id,
    brandVoiceGuide:
      'Elegant yet approachable. Dragon Palace is a family restaurant with decades of heritage. Copy should evoke warmth, authenticity, and the comfort of a great meal shared with loved ones. Avoid slang.',
    keySellingPoints: [
      'Authentic Cantonese and Szechuan recipes passed down 3 generations',
      'Fully licensed — extensive wine and cocktail menu',
      'Private dining room for up to 30 guests',
      'Award-winning dim sum every Saturday and Sunday brunch',
    ],
    contentThemes: ['heritage recipes', 'dim sum brunch', 'private dining', 'seasonal specials'],
    hashtagStrategy: [
      '#dragonpalaceleeds',
      '#chinesefood',
      '#dimsum',
      '#leedseats',
      '#authenticchinese',
      '#familydining',
    ],
    peakPostingTimes: {
      wednesday: ['11:00', '18:00'],
      friday: ['11:30', '17:30'],
      saturday: ['10:00', '19:00'],
      sunday: ['10:00', '17:00'],
    },
    menuItems: [
      { name: 'Peking Duck (Half)', description: 'Crispy duck served with pancakes, cucumber, and hoisin sauce', category: 'Signature', price: 24.99 },
      { name: 'Prawn Har Gow (4 pcs)', description: 'Steamed prawn dumplings — dim sum classic', category: 'Dim Sum', price: 5.50 },
      { name: 'Szechuan Mapo Tofu', description: 'Silken tofu in a spicy, numbing bean sauce', category: 'Mains', price: 10.99 },
      { name: 'Taro Egg Tarts (3 pcs)', description: 'Flaky pastry filled with silky egg custard', category: 'Desserts', price: 4.50 },
    ],
  });

  await brandProfileRepo.create(db, {
    clientId: tonysPizza.id,
    brandVoiceGuide:
      "Casual, fun, and unapologetically cheesy. Tony's is Manchester's go-to for no-nonsense, proper pizza. Copy should feel like a text from a mate who's discovered the best pizza in the city.",
    keySellingPoints: [
      '72-hour cold-fermented dough for the perfect base',
      'Wood-fired oven imported from Naples',
      'Collect 10 stamps, get a free pizza',
      'Vegan and gluten-free options on every menu',
    ],
    contentThemes: ['pizza perfection', 'mozzarella pulls', 'vegan options', 'loyalty rewards'],
    hashtagStrategy: [
      '#tonyspizza',
      '#manchesterpizza',
      '#woodfired',
      '#pizzalovers',
      '#manchestereats',
      '#veganpizza',
    ],
    peakPostingTimes: {
      tuesday: ['11:00', '18:00'],
      thursday: ['11:00', '18:00'],
      friday: ['12:00', '19:00'],
      saturday: ['12:00', '20:00'],
    },
    menuItems: [
      { name: 'Margherita Napoletana', description: 'San Marzano tomato, fior di latte, fresh basil', category: 'Classic', price: 10.99 },
      { name: 'Nduja Diavola', description: "Spicy Calabrian nduja, pepperoni, chilli oil — Tony's most popular", category: 'Signature', price: 14.99 },
      { name: 'Vegan Funghi', description: 'Cashew cream base, mixed mushrooms, truffle oil, rocket', category: 'Vegan', price: 13.49 },
      { name: 'Tiramisu', description: 'Classic Italian tiramisù, made fresh daily', category: 'Desserts', price: 5.50 },
    ],
  });

  console.log('Brand profiles created: 3');

  // ─────────────────────────────────────────────
  // 3. Social Accounts
  // ─────────────────────────────────────────────

  // Ali's Kebabs: IG + FB + Google Business — all connected
  await socialAccountRepo.create(db, {
    clientId: alisKebabs.id,
    platform: 'instagram',
    platformAccountId: 'aliskebabs_bradford',
    status: 'connected',
  });
  await socialAccountRepo.create(db, {
    clientId: alisKebabs.id,
    platform: 'facebook',
    platformAccountId: 'fb_aliskebabs',
    status: 'connected',
  });
  await socialAccountRepo.create(db, {
    clientId: alisKebabs.id,
    platform: 'google_business',
    platformAccountId: 'gb_aliskebabs_bradford',
    status: 'connected',
  });

  // Dragon Palace: IG expired, FB connected
  await socialAccountRepo.create(db, {
    clientId: dragonPalace.id,
    platform: 'instagram',
    platformAccountId: 'dragonpalaceleeds',
    status: 'expired',
  });
  await socialAccountRepo.create(db, {
    clientId: dragonPalace.id,
    platform: 'facebook',
    platformAccountId: 'fb_dragonpalaceleeds',
    status: 'connected',
  });

  // Tony's Pizza: IG + FB connected
  await socialAccountRepo.create(db, {
    clientId: tonysPizza.id,
    platform: 'instagram',
    platformAccountId: 'tonyspizza_mcr',
    status: 'connected',
  });
  await socialAccountRepo.create(db, {
    clientId: tonysPizza.id,
    platform: 'facebook',
    platformAccountId: 'fb_tonyspizzamcr',
    status: 'connected',
  });

  // Noodle Bar 88: IG disconnected
  await socialAccountRepo.create(db, {
    clientId: noodleBar.id,
    platform: 'instagram',
    platformAccountId: 'noodlebar88_sheffield',
    status: 'disconnected',
  });

  console.log('Social accounts created: 8');

  // ─────────────────────────────────────────────
  // 4. Content Items
  // ─────────────────────────────────────────────

  const now = Date.now();
  const inDays = (n: number) => now + n * 24 * 60 * 60 * 1000;
  const daysAgo = (n: number) => now - n * 24 * 60 * 60 * 1000;

  // 4a. Scheduled items (future dates)
  await contentItemRepo.create(db, {
    clientId: alisKebabs.id,
    contentType: 'food_hero',
    caption: 'The lamb doner that started it all 🔥 Freshly carved, every single day.',
    hashtags: ['#aliskebabs', '#bradfordfood', '#halalfood', '#kebablovers'],
    mediaUrls: ['https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=600&q=80'],
    platforms: ['instagram', 'facebook'],
    status: 'scheduled',
    scheduledAt: inDays(1),
  });

  await contentItemRepo.create(db, {
    clientId: dragonPalace.id,
    contentType: 'deal_offer',
    caption: '🥟 Dim Sum Brunch is back this Sunday! Two can dine for £28 — book your table now.',
    hashtags: ['#dragonpalaceleeds', '#dimsum', '#leedseats'],
    mediaUrls: ['https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&q=80'],
    platforms: ['facebook'],
    status: 'scheduled',
    scheduledAt: inDays(3),
  });

  await contentItemRepo.create(db, {
    clientId: tonysPizza.id,
    contentType: 'food_hero',
    caption: "That stretch though 🧀 Our Nduja Diavola is not for the faint-hearted. You've been warned.",
    hashtags: ['#tonyspizza', '#manchesterpizza', '#woodfired', '#pizzalovers'],
    mediaUrls: ['https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80'],
    platforms: ['instagram'],
    status: 'scheduled',
    scheduledAt: inDays(2),
  });

  await contentItemRepo.create(db, {
    clientId: alisKebabs.id,
    contentType: 'google_post',
    caption: "We're open until 4am this Friday and Saturday. Come find us on Manningham Lane 🌙",
    hashtags: [],
    mediaUrls: ['https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&q=80'],
    platforms: ['google_business'],
    status: 'scheduled',
    scheduledAt: inDays(5),
  });

  // 4b. Posted item — must create as draft first, then update
  const postedDraft = await contentItemRepo.create(db, {
    clientId: dragonPalace.id,
    contentType: 'review_highlight',
    caption: '"Best Peking Duck in Leeds, no contest." — James T. ⭐⭐⭐⭐⭐ Thank you, James!',
    hashtags: ['#dragonpalaceleeds', '#leedseats', '#chinesefood'],
    mediaUrls: ['https://images.unsplash.com/photo-1518492104633-130d0cc84637?w=600&q=80'],
    platforms: ['instagram', 'facebook'],
    status: 'draft',
  });

  await contentItemRepo.update(db, postedDraft.id, {
    status: 'posted',
    postedAt: daysAgo(2),
  });

  // 4c. Failed posts with mediaUrls — scheduling failures for Tony's Pizza
  await contentItemRepo.create(db, {
    clientId: tonysPizza.id,
    contentType: 'deal_offer',
    caption: 'Tuesday deal: any pizza + a drink for £12. Today only!',
    hashtags: ['#tonyspizza', '#manchestereats', '#pizzadeal'],
    mediaUrls: ['https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=600&q=80'],
    platforms: ['instagram', 'facebook'],
    status: 'failed',
    scheduledAt: daysAgo(1),
  });

  await contentItemRepo.create(db, {
    clientId: tonysPizza.id,
    contentType: 'behind_scenes',
    caption: 'Watch our chef hand-stretch the dough — 72 hours of cold fermentation in every base.',
    hashtags: ['#tonyspizza', '#woodfired', '#pizzalovers'],
    mediaUrls: ['https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=600&q=80'],
    platforms: ['instagram'],
    status: 'failed',
    scheduledAt: daysAgo(3),
  });

  // 4d. Generation error — no mediaUrls, for Ali's Kebabs
  await contentItemRepo.create(db, {
    clientId: alisKebabs.id,
    contentType: 'trending',
    caption: undefined,
    hashtags: [],
    mediaUrls: [],
    platforms: ['instagram', 'facebook'],
    status: 'failed',
  });

  // ─────────────────────────────────────────────
  // 5. Portal Users
  // ─────────────────────────────────────────────

  const hash = await bcrypt.hash('password', 10);

  // Active users — linked to existing clients
  await portalUserRepo.create(db, {
    email: 'ali@aliskebabs.co.uk',
    passwordHash: hash,
    name: 'Ali Khan',
    clientId: alisKebabs.id,
    status: 'active',
  });

  await portalUserRepo.create(db, {
    email: 'info@dragonpalace.co.uk',
    passwordHash: hash,
    name: 'Wei Chen',
    clientId: dragonPalace.id,
    status: 'active',
  });

  await portalUserRepo.create(db, {
    email: 'tony@tonyspizza.co.uk',
    passwordHash: hash,
    name: 'Tony Rossi',
    clientId: tonysPizza.id,
    status: 'active',
  });

  // Pending approval — submitted intake, waiting for operator review
  const pendingUser = await portalUserRepo.create(db, {
    email: 'hello@spicehouse.co.uk',
    passwordHash: hash,
    name: 'Raj Patel',
    status: 'pending_approval',
  });

  await intakeSubmissionRepo.create(db, {
    portalUserId: pendingUser.id,
    businessName: 'Spice House',
    address: '5 Broad Street, Birmingham, B1 2HE',
    phone: '0121 555 004',
    menuData: 'Chicken Tikka Masala £9.99, Lamb Biryani £10.99, Garlic Naan £2.50, Onion Bhaji £3.99',
    socialLinks: { instagram: 'https://instagram.com/spicehousebham', facebook: 'https://facebook.com/spicehouse' },
    brandPreferences: 'Warm colours, authentic Indian feel, family-friendly',
  });
  // Mark as submitted
  const pendingSub = await intakeSubmissionRepo.getByPortalUserId(db, pendingUser.id);
  if (pendingSub) {
    await intakeSubmissionRepo.update(db, pendingSub.id, {
      status: 'submitted',
      submittedAt: Date.now(),
    });
  }

  // Pending intake — just signed up, hasn't filled in the form yet
  await portalUserRepo.create(db, {
    email: 'noodlebar88@gmail.com',
    passwordHash: hash,
    name: 'Mei Lin',
    status: 'pending_intake',
  });

  console.log('Portal users created: 5 (all password: "password")');

  // ─────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────
  const allClients = await clientRepo.list(db);
  const allContent = await contentItemRepo.list(db);

  const scheduled = allContent.filter((c) => c.status === 'scheduled');
  const posted = allContent.filter((c) => c.status === 'posted');
  const failed = allContent.filter((c) => c.status === 'failed');

  console.log('\n✅  Seed complete!\n');
  const allPortalUsers = await portalUserRepo.list(db);

  console.log(`  Clients         : ${allClients.length}`);
  console.log(`  Brand profiles  : 3`);
  console.log(`  Social accounts : 8`);
  console.log(`  Content items   : ${allContent.length}`);
  console.log(`    - scheduled   : ${scheduled.length}`);
  console.log(`    - posted      : ${posted.length}`);
  console.log(`    - failed      : ${failed.length}`);
  console.log(`  Portal users    : ${allPortalUsers.length}`);
  console.log(`    - all use password: "password"`);
  console.log('');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

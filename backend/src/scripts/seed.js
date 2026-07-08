/**
 * Development seed script.
 * Populates the database with demo creators and campaigns so the platform
 * shows realistic content locally. Idempotent: it removes prior demo data first.
 *
 * Usage:  node src/scripts/seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/database');
const User = require('../models/User');
const Campaign = require('../models/Campaign');

const IMG = (id) => `https://res.cloudinary.com/demo/image/upload/w_1200,h_675,c_fill,q_auto,f_auto/${id}`;

const CREATORS = [
  { email: 'amara.diallo@example.com', firstName: 'Amara', lastName: 'Diallo', password: 'Password123', isEmailVerified: true, isVerifiedCreator: true, role: 'creator' },
  { email: 'kwame.mensah@example.com', firstName: 'Kwame', lastName: 'Mensah', password: 'Password123', isEmailVerified: true, isVerifiedCreator: true, role: 'creator' },
  { email: 'admin@crowdfundafrica.com', firstName: 'Site', lastName: 'Admin', password: 'Admin12345', isEmailVerified: true, role: 'admin' }
];

const days = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

const CAMPAIGNS = [
  {
    title: 'Clean Water Wells for Fadiouth Village',
    shortDescription: 'Bringing safe, reliable drinking water to 2,000 residents of Fadiouth, Senegal.',
    description: 'Fadiouth, the shell island of Senegal, has struggled with access to clean drinking water for decades. This campaign funds three solar-powered boreholes and a distribution network so every family has water within a five-minute walk. Funds cover drilling, pumps, storage tanks, and two years of maintenance training for local technicians.',
    category: 'infrastructure', coverImage: IMG('samples/landscapes/nature-mountains.jpg'),
    targetAmount: 25000, raisedAmount: 16750, donorCount: 142, currency: 'XOF',
    location: { country: 'Senegal', region: 'Thiès', village: 'Fadiouth' },
    isFeatured: true, blockchainEnabled: true, blockchainNetwork: 'polygon',
    milestones: [
      { title: 'First borehole drilled', targetAmount: 8000, isReached: true, reachedAt: days(-20) },
      { title: 'Solar pumps installed', targetAmount: 16000, isReached: true, reachedAt: days(-4) },
      { title: 'Full distribution network', targetAmount: 25000, isReached: false }
    ],
    deadline: days(22)
  },
  {
    title: 'Solar-Powered Classrooms in Kumasi',
    shortDescription: 'Equipping five rural schools with solar power and tablets for 1,200 students.',
    description: 'Many schools around Kumasi lose hours of learning to power cuts. We are installing solar panels, batteries, and a set of rugged tablets loaded with offline curriculum so students can keep learning regardless of the grid. Teachers receive training and each school gets a three-year support plan.',
    category: 'education', coverImage: IMG('samples/people/kitchen-bar.jpg'),
    targetAmount: 18000, raisedAmount: 12300, donorCount: 205, currency: 'GHS',
    location: { country: 'Ghana', region: 'Ashanti', city: 'Kumasi' },
    isFeatured: true,
    milestones: [
      { title: 'Two schools electrified', targetAmount: 7000, isReached: true, reachedAt: days(-12) },
      { title: 'Tablets distributed', targetAmount: 14000, isReached: false }
    ],
    deadline: days(35)
  },
  {
    title: 'Maternal Health Clinic — Kibera',
    shortDescription: 'A community clinic providing safe prenatal and delivery care in Nairobi.',
    description: 'Kibera is home to hundreds of thousands of people with limited access to maternal care. This campaign funds equipment, a delivery room, and stipends for two midwives so mothers can give birth safely close to home.',
    category: 'health', coverImage: IMG('samples/food/dessert.jpg'),
    targetAmount: 40000, raisedAmount: 9800, donorCount: 88, currency: 'KES',
    location: { country: 'Kenya', city: 'Nairobi', village: 'Kibera' },
    isFeatured: true, isUrgent: true,
    deadline: days(48)
  },
  {
    title: 'Rebuild the Bakel Community Market',
    shortDescription: 'Restoring the market destroyed by flooding so 300 traders can work again.',
    description: 'Seasonal flooding destroyed the central market in Bakel. This campaign rebuilds covered stalls, drainage, and storage so local traders — most of them women — can return to earning a living.',
    category: 'disaster-relief', coverImage: IMG('samples/landscapes/beach-boat.jpg'),
    targetAmount: 30000, raisedAmount: 27400, donorCount: 316, currency: 'XOF',
    location: { country: 'Senegal', region: 'Tambacounda', city: 'Bakel' },
    isFeatured: true,
    deadline: days(10)
  },
  {
    title: 'Drip Irrigation Co-op for Kano Farmers',
    shortDescription: 'Helping 60 smallholder farmers triple yields with efficient irrigation.',
    description: 'A farmer cooperative in Kano is switching to drip irrigation to survive longer dry seasons. Funds buy pumps, tubing, and training, shared across 60 family farms.',
    category: 'agriculture', coverImage: IMG('samples/ecommerce/accessories-bag.jpg'),
    targetAmount: 15000, raisedAmount: 5200, donorCount: 47, currency: 'NGN',
    location: { country: 'Nigeria', region: 'Kano' },
    isFeatured: false,
    deadline: days(40)
  },
  {
    title: 'Youth Coding Hub in Dakar',
    shortDescription: 'A free coding and robotics lab for 400 young people in Dakar.',
    description: 'We are opening a community tech hub with laptops, internet, and mentors so young people can learn software, design, and robotics — and build businesses at home instead of migrating for work.',
    category: 'technology', coverImage: IMG('samples/animals/three-dogs.jpg'),
    targetAmount: 22000, raisedAmount: 14100, donorCount: 173, currency: 'XOF',
    location: { country: 'Senegal', city: 'Dakar' },
    isFeatured: true, blockchainEnabled: true, blockchainNetwork: 'polygon',
    deadline: days(29)
  },
  {
    title: 'Reforest the Slopes of Mount Kenya',
    shortDescription: 'Planting 50,000 indigenous trees to protect watersheds and soil.',
    description: 'Working with local schools and community groups, this project plants and cares for 50,000 indigenous seedlings to restore degraded slopes, protect water sources, and create seasonal jobs.',
    category: 'environment', coverImage: IMG('samples/landscapes/girl-urban-view.jpg'),
    targetAmount: 12000, raisedAmount: 3600, donorCount: 61, currency: 'KES',
    location: { country: 'Kenya', region: 'Nyeri' },
    isFeatured: false,
    deadline: days(55)
  }
];

async function run() {
  await connectDB();

  const emails = CREATORS.map((c) => c.email);
  await Campaign.deleteMany({ title: { $in: CAMPAIGNS.map((c) => c.title) } });
  await User.deleteMany({ email: { $in: emails } });

  const users = [];
  for (const c of CREATORS) {
    users.push(await User.create(c));
  }
  const creators = users.filter((u) => u.role === 'creator');

  let i = 0;
  for (const data of CAMPAIGNS) {
    const creator = creators[i % creators.length];
    await Campaign.create({
      ...data,
      creator: creator._id,
      status: 'active',
      startDate: days(-30),
      featuredUntil: data.isFeatured ? days(60) : undefined,
      suggestedAmounts: [10, 25, 50, 100],
      allowRecurring: true,
      allowAnonymous: true
    });
    i++;
  }

  const [campaignCount, userCount] = await Promise.all([
    Campaign.countDocuments(),
    User.countDocuments()
  ]);
  console.log(`Seed complete: ${campaignCount} campaigns, ${userCount} users.`);
  console.log('Demo logins:');
  console.log('  amara.diallo@example.com / Password123  (creator)');
  console.log('  admin@crowdfundafrica.com / Admin12345  (admin)');

  await mongoose.connection.close();
  process.exit(0);
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

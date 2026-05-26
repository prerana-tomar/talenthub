const express     = require('express');
const router      = express.Router();
const Competition = require('../models/Competition');
const { protect } = require('../middleware/authMiddleware');

// Seed default competitions if none exist
const seedCompetitions = async () => {
  const count = await Competition.countDocuments();
  if (count > 0) return;

  const now = new Date();
  const competitions = [
    {
      name: 'Singing Superstar',
      category: 'Singing',
      description: 'Show your vocal talent! From classical to pop, all singing styles welcome. Upload your best performance and win big.',
      prize: '₹25,000',
      prizeAmount: 25000,
      maxParticipants: 50,
      status: 'active',
      difficulty: 'Open',
      startDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      deadline: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000),
      icon: '🎤',
      color: '#a78bfa',
      gradient: 'linear-gradient(135deg,#7c3aed,#a855f7)',
      tags: ['Any Style','Solo/Group','2-5 min'],
      rules: ['Original song or cover allowed','Clear audio quality required','Solo or group (max 4 members)'],
    },
    {
      name: 'Dance Battle',
      category: 'Dance',
      description: 'From Bharatanatyam to Hip-Hop, show your moves! All dance forms welcome. Let the beat guide you to victory.',
      prize: '₹20,000',
      prizeAmount: 20000,
      maxParticipants: 40,
      status: 'active',
      difficulty: 'Intermediate',
      startDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      deadline: new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000),
      icon: '💃',
      color: '#f472b6',
      gradient: 'linear-gradient(135deg,#ec4899,#f472b6)',
      tags: ['Any Style','1-4 min','Solo/Duo'],
      rules: ['Any dance form accepted','Good lighting required','Max 2 performers'],
    },
    {
      name: 'Rap Showdown',
      category: 'Rap',
      description: 'Spit bars in Hindi, English, or any regional language. Original lyrics only. Show your lyrical genius!',
      prize: '₹15,000',
      prizeAmount: 15000,
      maxParticipants: 30,
      status: 'active',
      difficulty: 'Open',
      startDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      deadline: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000),
      icon: '🎙️',
      color: '#34d399',
      gradient: 'linear-gradient(135deg,#059669,#34d399)',
      tags: ['Original Lyrics','1-3 min','Any Language'],
      rules: ['Original rap only','No offensive language','Beat can be existing'],
    },
    {
      name: 'Comedy Night',
      category: 'Comedy',
      description: 'Make India laugh! Stand-up, skit, or improvised comedy — all formats welcome. Clean content only.',
      prize: '₹12,000',
      prizeAmount: 12000,
      maxParticipants: 25,
      status: 'upcoming',
      difficulty: 'Open',
      startDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      deadline: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
      icon: '😂',
      color: '#fbbf24',
      gradient: 'linear-gradient(135deg,#d97706,#fbbf24)',
      tags: ['Stand-up/Skit','2-5 min','Clean Content'],
      rules: ['Clean and respectful content only','No personal attacks','Original material'],
    },
    {
      name: 'Poetry Slam',
      category: 'Poetry',
      description: 'Words have power! Share your poetry, shayari, or spoken word. Hindi, English, or any Indian language.',
      prize: '₹10,000',
      prizeAmount: 10000,
      maxParticipants: 35,
      status: 'upcoming',
      difficulty: 'Beginner',
      startDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      deadline: new Date(now.getTime() + 50 * 24 * 60 * 60 * 1000),
      icon: '✍️',
      color: '#60a5fa',
      gradient: 'linear-gradient(135deg,#2563eb,#60a5fa)',
      tags: ['Original Poetry','1-3 min','Any Language'],
      rules: ['Original poetry only','Any language accepted','Spoken word also welcome'],
    },
    {
      name: 'Acting Arena',
      category: 'Acting',
      description: 'Monologue, scene, or dialogue — bring your character to life! From drama to comedy, all acting styles welcome.',
      prize: '₹18,000',
      prizeAmount: 18000,
      maxParticipants: 20,
      status: 'ended',
      difficulty: 'Intermediate',
      startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      deadline: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      icon: '🎭',
      color: '#818cf8',
      gradient: 'linear-gradient(135deg,#4f46e5,#818cf8)',
      tags: ['Monologue/Scene','3-6 min','Any Theme'],
      rules: ['Solo or duo performance','Original or adapted script','Good audio/video quality'],
      winners: [
        { rank: 1, name: 'Arjun Verma',   prize: '₹10,000', avatar: 'A' },
        { rank: 2, name: 'Riya Sharma',   prize: '₹5,000',  avatar: 'R' },
        { rank: 3, name: 'Dev Arora',     prize: '₹3,000',  avatar: 'D' },
      ],
    },
    {
      name: 'Instrumental Showdown',
      category: 'Instrumental',
      description: 'Any instrument, any genre. Classical sitar to electric guitar — let your instrument speak for you!',
      prize: '₹8,000',
      prizeAmount: 8000,
      maxParticipants: 30,
      status: 'upcoming',
      difficulty: 'Open',
      startDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
      deadline: new Date(now.getTime() + 40 * 24 * 60 * 60 * 1000),
      icon: '🎸',
      color: '#f97316',
      gradient: 'linear-gradient(135deg,#ea580c,#f97316)',
      tags: ['Any Instrument','Any Genre','2-5 min'],
      rules: ['Any instrument accepted','Solo performance only','Original or cover composition'],
    },
  ];

  await Competition.insertMany(competitions);
  console.log('✅ Competitions seeded!');
};

// GET all competitions
router.get('/', async (req, res) => {
  try {
    await seedCompetitions();
    const comps = await Competition.find()
      .sort({ createdAt: -1 })
      .populate('participants', 'username');
    res.json(comps);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET single competition
router.get('/:id', async (req, res) => {
  try {
    const comp = await Competition.findById(req.params.id)
      .populate('participants', 'username email');
    if (!comp) return res.status(404).json({ message: 'Not found' });
    res.json(comp);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST register for competition
router.post('/:id/register', protect, async (req, res) => {
  try {
    const comp = await Competition.findById(req.params.id);
    if (!comp) return res.status(404).json({ error: 'Competition not found' });
    if (comp.status === 'ended') return res.status(400).json({ error: 'Competition has ended' });
    if (comp.status === 'upcoming') return res.status(400).json({ error: 'Competition not started yet' });

    const alreadyRegistered = comp.participants
      .map(p => p.toString())
      .includes(req.user._id.toString());

    if (alreadyRegistered) return res.status(400).json({ error: 'Already registered!' });
    if (comp.participants.length >= comp.maxParticipants)
      return res.status(400).json({ error: 'Competition is full!' });

    comp.participants.push(req.user._id);
    await comp.save();

    res.json({
      message: 'Registered successfully!',
      participantCount: comp.participants.length,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error', message: err.message });
  }
});

module.exports = router;
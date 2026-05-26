const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {protect} = require('../middleware/authMiddleware');



// Multer config — video uploads folder mein save hoga
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/highlights');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (req, file, cb) => {
    const allowed = ['video/mp4', 'video/quicktime', 'video/webm'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Sirf MP4, MOV aur WebM allowed hai'));
  },
});

// POST /api/highlights/generate
router.post('/generate', protect, upload.single('video'), async (req, res) => {
  try {
    const { duration, reelCount, options } = req.body;
    const videoPath = req.file?.path;

    if (!videoPath) {
      return res.status(400).json({ success: false, message: 'Video file required hai' });
    }

    // ====================================================
    // STEP 1: Real implementation ke liye ffmpeg chahiye
    // npm install fluent-ffmpeg
    // Phir yeh uncomment karo:
    //
    // const ffmpeg = require('fluent-ffmpeg');
    // const framesDir = path.join(__dirname, '../uploads/frames', Date.now().toString());
    // fs.mkdirSync(framesDir, { recursive: true });
    //
    // // Har second ek frame extract karo
    // await new Promise((resolve, reject) => {
    //   ffmpeg(videoPath)
    //     .output(path.join(framesDir, 'frame_%04d.jpg'))
    //     .outputOptions(['-vf fps=1'])
    //     .on('end', resolve)
    //     .on('error', reject)
    //     .run();
    // });
    //
    // STEP 2: Claude Vision se frames analyze karo
    // const Anthropic = require('@anthropic-ai/sdk');
    // const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    // const frames = fs.readdirSync(framesDir).slice(0, 10); // pehle 10 frames
    //
    // const scores = [];
    // for (const frame of frames) {
    //   const imageData = fs.readFileSync(path.join(framesDir, frame)).toString('base64');
    //   const response = await client.messages.create({
    //     model: 'claude-sonnet-4-20250514',
    //     max_tokens: 200,
    //     messages: [{
    //       role: 'user',
    //       content: [
    //         { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageData }},
    //         { type: 'text', text: 'Rate this performance frame 1-10 on energy and emotion. Return ONLY JSON: {"score": 8, "reason": "high energy moment"}' }
    //       ]
    //     }]
    //   });
    //   const text = response.content[0].text;
    //   scores.push({ frame, ...JSON.parse(text) });
    // }
    //
    // // Top scoring frames ke timestamps
    // const topFrames = scores.sort((a,b) => b.score - a.score).slice(0, parseInt(reelCount));
    //
    // STEP 3: Har top frame ke around clip cut karo
    // const durationSec = parseInt(duration) || 30;
    // const clips = [];
    // for (const f of topFrames) {
    //   const frameNum = parseInt(f.frame.replace('frame_','').replace('.jpg',''));
    //   const startTime = Math.max(0, frameNum - Math.floor(durationSec/2));
    //   const outPath = path.join(__dirname, '../uploads/highlights', `clip_${Date.now()}.mp4`);
    //   await new Promise((resolve, reject) => {
    //     ffmpeg(videoPath)
    //       .setStartTime(startTime)
    //       .setDuration(durationSec)
    //       .output(outPath)
    //       .on('end', resolve)
    //       .on('error', reject)
    //       .run();
    //   });
    //   clips.push({ path: outPath, score: f.score, reason: f.reason, startTime });
    // }
    // ====================================================

    // ABHI KE LIYE — Demo response (jab tak ffmpeg setup nahi hota)
    const demoReels = Array.from({ length: parseInt(reelCount) || 3 }, (_, i) => ({
      id: i + 1,
      title: ['Peak Moment', 'Crowd Reaction', 'Best Expression', 'High Energy', 'Finale'][i] || `Highlight ${i+1}`,
      timeRange: `${i}:${15 + i*30 < 60 ? `${15 + i*30}` : '00'} – ${i}:${45 + i*30 < 60 ? `${45 + i*30}` : '30'}`,
      score: Math.floor(Math.random() * 15) + 82,
      gradient: ['linear-gradient(135deg,#1a0537,#3b0764)', 'linear-gradient(135deg,#0a1628,#1e3a5f)', 'linear-gradient(135deg,#1a0a0a,#5c1a1a)'][i % 3],
      url: null,
    }));

    res.json({
      success: true,
      message: 'Highlights generated!',
      reels: demoReels,
      videoPath: req.file.filename,
    });

  } catch (err) {
    console.error('Highlight generation error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
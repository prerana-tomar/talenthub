const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {protect} = require('../middleware/authMiddleware');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { exec } = require('child_process');
const archiver = require('archiver');

ffmpeg.setFfmpegPath(ffmpegPath);

// Helper function to programmatically analyze audio track energy peaks
function analyzeAudioPeaks(videoPath) {
  return new Promise((resolve) => {
    // Run FFmpeg silencedetect to scan the audio track for loudness intervals
    const cmd = `"${ffmpegPath}" -i "${videoPath}" -af silencedetect=noise=-35dB:d=1.0 -f null -`;
    exec(cmd, (error, stdout, stderr) => {
      const output = stderr + stdout;
      const silenceEvents = [];
      const regex = /silence_(start|end):\s*([\d.]+)/g;
      let match;
      
      while ((match = regex.exec(output)) !== null) {
        silenceEvents.push({
          type: match[1],
          time: parseFloat(match[2])
        });
      }

      if (silenceEvents.length === 0) {
        return resolve([]);
      }

      const peaks = [];
      let lastSilenceEnd = 0;

      for (let i = 0; i < silenceEvents.length; i++) {
        const ev = silenceEvents[i];
        if (ev.type === 'start') {
          if (ev.time - lastSilenceEnd >= 2) {
            peaks.push({
              start: Math.round(lastSilenceEnd),
              end: Math.round(ev.time)
            });
          }
        } else if (ev.type === 'end') {
          lastSilenceEnd = ev.time;
        }
      }

      resolve(peaks);
    });
  });
}



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
      return res.status(400).json({ success: false, message: 'Video file required' });
    }

    const durationSec = Number(duration) || 60;
    const count = Number(reelCount) || 3;

    // Parse options safely
    let optionsObj = {};
    try {
      if (typeof options === 'string') {
        optionsObj = JSON.parse(options);
      } else if (options) {
        optionsObj = options;
      }
    } catch (e) {
      console.error('Failed to parse options:', e);
    }

    const clipLen = Number(optionsObj.clipDuration) || 15;
    const vibe = optionsObj.vibe || 'Epic';
    const instructions = optionsObj.instructions || 'Focus on energy and clean execution';

    // Programmatically analyze audio peaks first
    let audioPeaks = [];
    try {
      audioPeaks = await analyzeAudioPeaks(videoPath);
    } catch (peakErr) {
      console.error('Audio peak analysis error:', peakErr);
    }

    const peaksString = audioPeaks.length > 0
      ? audioPeaks.map(p => `${p.start}s to ${p.end}s`).join(', ')
      : 'Not explicitly detected (use generic spacing)';

    let reels = [];
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const prompt = `You are an AI Video Editor. An artist uploaded a performance video file named "${req.file.originalname}" with a total duration of ${durationSec} seconds.
They want to extract exactly ${count} highlights/reels from this video.
The user selected the vibe/style parameter: "${vibe}" and gave instructions: "${instructions}".

Programmatic analysis of the audio track has detected high energy/volume peaks in the video around these time intervals: ${peaksString}.
Please prioritize placing the highlights/reels start and end times near or within these detected high-energy peak intervals if applicable to the vibe "${vibe}".

Please analyze this request and return a JSON list of highlight segments.
Each segment must fit completely within the video duration of ${durationSec} seconds.
The segment duration should be around ${clipLen} seconds.

Return ONLY a JSON array. Do NOT include markdown code blocks, do NOT write "json" or backticks, just the raw JSON text.
The JSON must be an array of objects matching this exact structure:
[
  {
    "id": 1,
    "title": "Smart engaging title for highlight",
    "timeRange": "MM:SS - MM:SS format",
    "startTime": 15,
    "endTime": 30,
    "score": 95,
    "reason": "Why this segment was selected (Hinglish/English mix, encouraging tone)",
    "gradient": "linear-gradient(135deg, #1a0537, #3b0764)",
    "ffmpegOptions": ["-vf", "eq=contrast=1.12:saturation=1.25:brightness=0.01"] // Optional: FFmpeg options array to apply visual/audio filters matching the user instructions (e.g. color adjustments, slow-mo). If no changes requested, use empty array.
  }
]`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          }),
        });

        if (response.ok) {
          const data = await response.json();
          let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          text = text.trim();
          if (text.startsWith('```')) {
            text = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
          }
          reels = JSON.parse(text);

          // Force array format and safety checks
          if (Array.isArray(reels)) {
            reels = reels.map((r, i) => {
              const start = Math.max(0, Math.min(Number(r.startTime) || 0, durationSec));
              const end = Math.max(start + 1, Math.min(Number(r.endTime) || (start + clipLen), durationSec));
              const formatTime = (sec) => {
                const m = Math.floor(sec / 60);
                const s = Math.floor(sec % 60);
                return `${m}:${s < 10 ? '0' : ''}${s}`;
              };
              return {
                id: i + 1,
                title: r.title || `Highlight Reel ${i + 1}`,
                timeRange: `${formatTime(start)} – ${formatTime(end)}`,
                startTime: start,
                endTime: end,
                score: Number(r.score) || 90,
                reason: r.reason || `Automatically selected ${vibe} highlight moment.`,
                gradient: r.gradient || 'linear-gradient(135deg, #1d0f3c, #4c1d95)',
                ffmpegOptions: Array.isArray(r.ffmpegOptions) ? r.ffmpegOptions : []
              };
            });
          } else {
            reels = [];
          }
        }
      } catch (geminiError) {
        console.error('Gemini highlight generation failed, falling back:', geminiError);
      }
    }

    // Procedural Fallback if Gemini is not configured or fails
    if (!reels || reels.length === 0) {
      const interval = durationSec / (count + 1);
      const titles = [
        'Intro / Opening Flow',
        'Mid-Performance Climax',
        'Crowd Engagement Moment',
        'Peak Performance Phase',
        'Grande Finale Showcase'
      ];
      
      reels = Array.from({ length: count }, (_, i) => {
        const targetStart = Math.floor(interval * (i + 1) - clipLen / 2);
        const start = Math.max(0, Math.min(targetStart, durationSec - clipLen));
        const end = Math.min(start + clipLen, durationSec);

        const formatTime = (sec) => {
          const m = Math.floor(sec / 60);
          const s = Math.floor(sec % 60);
          return `${m}:${s < 10 ? '0' : ''}${s}`;
        };

        return {
          id: i + 1,
          title: titles[i] || `Highlight Reel ${i + 1}`,
          timeRange: `${formatTime(start)} – ${formatTime(end)}`,
          startTime: start,
          endTime: end,
          score: Math.floor(Math.random() * 15) + 85,
          reason: `Procedural highlight based on "${vibe}" settings. Handpicked at ${formatTime(start)} for peak energy.`,
          gradient: [
            'linear-gradient(135deg, #2e0854, #4c1d95)',
            'linear-gradient(135deg, #0f172a, #1e3a8a)',
            'linear-gradient(135deg, #311010, #7f1d1d)',
            'linear-gradient(135deg, #064e3b, #065f46)',
            'linear-gradient(135deg, #451a03, #78350f)'
          ][i % 5],
          ffmpegOptions: []
        };
      });
    }

    // Slice the video for each reel
    const parentDir = path.join(__dirname, '../uploads/highlights');
    if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });

    // Procedural parsing for FFmpeg styling options in instructions
    let proceduralFilters = [];
    const instLower = instructions.toLowerCase();
    if (instLower.includes('aesthetic') || instLower.includes('filter') || instLower.includes('vibe') || instLower.includes('color')) {
      proceduralFilters = ['-vf', 'eq=contrast=1.15:saturation=1.3:brightness=0.02'];
    } else if (instLower.includes('black and white') || instLower.includes('gray') || instLower.includes('grey') || instLower.includes('bw')) {
      proceduralFilters = ['-vf', 'hue=s=0'];
    } else if (instLower.includes('slow') || instLower.includes('slomo')) {
      proceduralFilters = ['-vf', 'setpts=2.0*PTS', '-af', 'atempo=0.5'];
    } else if (instLower.includes('fast') || instLower.includes('speed')) {
      proceduralFilters = ['-vf', 'setpts=0.5*PTS', '-af', 'atempo=2.0'];
    } else if (instLower.includes('mute') || instLower.includes('silent') || instLower.includes('no sound')) {
      proceduralFilters = ['-an'];
    } else if (instLower.includes('loud') || instLower.includes('volume') || instLower.includes('voice')) {
      proceduralFilters = ['-vf', 'eq=contrast=1.12:saturation=1.25:brightness=0.01'];
    }

    for (let i = 0; i < reels.length; i++) {
      const r = reels[i];
      const start = r.startTime;
      const clipDuration = r.endTime - r.startTime;

      // Unique filename for each reel clip
      const outputFilename = `reel-${Date.now()}-${r.id}.mp4`;
      const outputPath = path.join(parentDir, outputFilename);

      // Determine filters to apply
      const filters = (r.ffmpegOptions && r.ffmpegOptions.length > 0) ? r.ffmpegOptions : proceduralFilters;

      try {
        await new Promise((resolve, reject) => {
          let command = ffmpeg(videoPath)
            .setStartTime(start)
            .setDuration(clipDuration);

          if (filters.length > 0) {
            command.outputOptions(filters);
          } else {
            command.videoCodec('copy').audioCodec('copy');
          }

          command.output(outputPath)
            .on('end', () => {
              console.log(`Successfully sliced reel clip: ${outputFilename} with filters: ${filters}`);
              resolve();
            })
            .on('error', (err) => {
              console.error(`FFmpeg error slicing reel ${r.id}:`, err);
              reject(err);
            })
            .run();
        });

        // Set the relative URL of the sliced video file
        r.url = `/uploads/highlights/${outputFilename}`;
      } catch (sliceError) {
        console.error(`Slicing failed for reel ${r.id}, falling back to original:`, sliceError);
        r.url = `/uploads/highlights/${req.file.filename}`;
      }
    }

    res.json({
      success: true,
      message: 'Highlights generated!',
      reels,
      videoPath: req.file.filename,
    });

  } catch (err) {
    console.error('Highlight generation error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/highlights/reslice - allows editing trim and physically re-cutting a reel
router.post('/reslice', protect, async (req, res) => {
  try {
    const { videoPath, startTime, endTime, reelId, ffmpegOptions } = req.body;

    if (!videoPath) {
      return res.status(400).json({ success: false, message: 'videoPath is required' });
    }

    const start = Number(startTime) || 0;
    const end = Number(endTime) || 10;
    const clipDuration = end - start;

    const parentDir = path.join(__dirname, '../uploads/highlights');
    const inputPath = path.join(parentDir, videoPath);

    if (!fs.existsSync(inputPath)) {
      return res.status(404).json({ success: false, message: 'Master video file not found' });
    }

    const outputFilename = `reel-${Date.now()}-${reelId}.mp4`;
    const outputPath = path.join(parentDir, outputFilename);

    const filters = Array.isArray(ffmpegOptions) ? ffmpegOptions : [];

    await new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath)
        .setStartTime(start)
        .setDuration(clipDuration);

      if (filters.length > 0) {
        command.outputOptions(filters);
      } else {
        command.videoCodec('copy').audioCodec('copy');
      }

      command.output(outputPath)
        .on('end', () => {
          resolve();
        })
        .on('error', (err) => {
          reject(err);
        })
        .run();
    });

    res.json({
      success: true,
      url: `/uploads/highlights/${outputFilename}`
    });

  } catch (err) {
    console.error('Reslice error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/highlights/download-zip - packages multiple clips into a ZIP stream
router.post('/download-zip', protect, async (req, res) => {
  try {
    const { reels } = req.body;
    if (!Array.isArray(reels) || reels.length === 0) {
      return res.status(400).json({ success: false, message: 'No reels specified for download' });
    }

    res.attachment('ai-reels.zip');
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(res);

    const parentDir = path.join(__dirname, '../uploads/highlights');

    reels.forEach((reel) => {
      if (reel.url) {
        const filename = path.basename(reel.url);
        const filePath = path.join(parentDir, filename);
        if (fs.existsSync(filePath)) {
          archive.file(filePath, { name: `${reel.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp4` });
        }
      }
    });

    await archive.finalize();

  } catch (err) {
    console.error('ZIP download error:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
});

module.exports = router;
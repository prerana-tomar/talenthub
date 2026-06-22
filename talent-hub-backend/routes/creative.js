const express = require('express');
const router = express.Router();

router.post('/generate', async (req, res) => {
  const { prompt } = req.body;
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    res.json({ content: [{ text }] });
  } catch (err) {
    res.status(500).json({ message: 'Generation failed', error: err.message });
  }
});

module.exports = router;
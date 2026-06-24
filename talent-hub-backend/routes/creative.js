const express = require('express');
const router  = express.Router();

// POST /api/creative/generate
router.post('/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ message: 'Prompt required' });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':            'application/json',
        'x-api-key':               process.env.ANTHROPIC_API_KEY,
        'anthropic-version':       '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-6',
        max_tokens: 1024,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Anthropic error:', data);
      return res.status(500).json({ message: 'AI generation failed', error: data });
    }

    res.json({ content: data.content });

  } catch (err) {
    console.error('Creative generate error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/creative/assist
router.post('/assist', async (req, res) => {
  try {
    const { type, language, mood, writing, context } = req.body;
    if (!writing) {
      return res.status(400).json({ message: 'Writing content is required' });
    }

    const prompt = `You are a professional creative writer, poet, and lyricist.
The user has provided an incomplete piece of writing and some details. Your task is to complete the writing naturally, keeping the original style, rhythm, vocabulary, and emotion intact. Also, provide exactly 3 useful, brief writing tips in the language/style of the completion.

Details:
- Type of writing: ${type}
- Language: ${language}
- Mood/Vibe: ${mood}
- Additional Context/Instructions: ${context || 'None'}

Incomplete Writing:
"""
${writing}
"""

You MUST respond with a valid JSON object only. Do NOT include any markdown formatting like \`\`\`json or regular conversational text before or after the JSON.
The JSON object MUST follow this exact structure:
{
  "completedWriting": "The complete writing combining the user's initial part and the AI's completion",
  "tips": [
    "Tip 1...",
    "Tip 2...",
    "Tip 3..."
  ]
}

Ensure the completion flows seamlessly from the user's input. Write the completed writing fully (starting with the user's input, then completing it).`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Anthropic API error:', data);
      return res.status(500).json({ message: 'AI processing failed', error: data });
    }

    let responseText = data.content?.[0]?.text || '';
    
    // Cleanup if Claude wrapped in ```json ... ```
    if (responseText.includes('```')) {
      responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    }

    try {
      const parsedData = JSON.parse(responseText);
      return res.json({
        completedWriting: parsedData.completedWriting,
        tips: parsedData.tips || []
      });
    } catch (parseError) {
      console.error('Failed to parse Claude response as JSON. Original response:', responseText);
      return res.status(500).json({ 
        message: 'Invalid AI response format', 
        error: parseError.message, 
        rawText: responseText 
      });
    }

  } catch (err) {
    console.error('Creative assist error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
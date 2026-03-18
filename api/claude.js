// /api/claude.js
// Vercel Serverless Function - Proxies requests to Anthropic API

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { model, max_tokens, system, messages } = req.body;

    // Validate model (only allow our approved models)
    const allowedModels = [
      'claude-sonnet-4-20250514',
      'claude-3-5-haiku-20241022'
    ];
    
    if (!allowedModels.includes(model)) {
      return res.status(400).json({ error: 'Invalid model' });
    }

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: max_tokens || 500,
        system: system,
        messages: messages
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', errorText);
      return res.status(response.status).json({ 
        error: 'Claude API error',
        message: errorText 
      });
    }

    const data = await response.json();

    // Return response with usage stats for cost tracking
    return res.status(200).json({
      content: data.content,
      usage: data.usage,
      model: data.model,
      stop_reason: data.stop_reason
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      error: 'Server error',
      message: error.message 
    });
  }
}

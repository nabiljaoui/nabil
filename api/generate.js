export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'No prompt' });

  const HF_TOKEN = process.env.HF_TOKEN;
  if (!HF_TOKEN) {
    return res.status(500).json({ error: 'Missing HF_TOKEN in Vercel Settings' });
  }

  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/damo-vilab/modelscope-text-to-video-synthesis",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: prompt }),
      }
    );

    if (response.status === 503) {
      return res.status(503).json({ error: 'Model is loading, wait 30s and try again' });
    }

    if (!response.ok) {
      const txt = await response.text();
      return res.status(500).json({ error: `HF Error: ${txt.slice(0,200)}` });
    }

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    
    res.status(200).json({ 
      video: `data:video/mp4;base64,${base64}`,
      success: true 
    });

  } catch (e) {
    res.status(500).json({ error: `fetch failed: ${e.message}` });
  }
}

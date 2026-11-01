export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'No prompt' });
  const HF_TOKEN = process.env.HF_TOKEN;
  if (!HF_TOKEN) return res.status(500).json({ error: 'HF_TOKEN missing' });
  try {
    const hfRes = await fetch(
      "https://api-inference.huggingface.co/models/damo-vilab/modelscope-text-to-video-synthesis",
      {
        method: "POST",
        headers: { "Authorization": `Bearer ${HF_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: prompt })
      }
    );
    if (!hfRes.ok) {
      const err = await hfRes.text();
      return res.status(500).json({ error: err });
    }
    const videoBuffer = await hfRes.arrayBuffer();
    res.setHeader('Content-Type', 'video/mp4');
    return res.send(Buffer.from(videoBuffer));
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

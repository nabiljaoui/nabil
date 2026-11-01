export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { prompt, image } = req.body
    const FAL_KEY = process.env.FAL_KEY
    if (!FAL_KEY) return res.status(500).json({ error: 'FAL_KEY missing' })
    const finalPrompt = prompt || 'cinematic motion, slow zoom, highly detailed, 4k'
    let endpoint = ''
    let payload = {}
    if (image) {
      endpoint = 'https://queue.fal.run/fal-ai/kling-video/v2.1/master/image-to-video'
      payload = { prompt: finalPrompt, image_url: image, duration: "5", aspect_ratio: "16:9" }
    } else {
      endpoint = 'https://queue.fal.run/fal-ai/kling-video/v2.1/master/text-to-video'
      payload = { prompt: finalPrompt, duration: "5", aspect_ratio: "16:9" }
    }
    const submitRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Authorization': `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const submitData = await submitRes.json()
    if (!submitRes.ok) return res.status(500).json({ error: JSON.stringify(submitData) })
    const requestId = submitData.request_id
    let tries = 0
    let videoUrl = ''
    while (tries < 60) {
      await new Promise(r => setTimeout(r, 3000))
      const statusRes = await fetch(`https://queue.fal.run/fal-ai/kling-video/requests/${requestId}/status`, {
        headers: { 'Authorization': `Key ${FAL_KEY}` }
      })
      const statusData = await statusRes.json()
      if (statusData.status === 'COMPLETED') {
        const resultRes = await fetch(`https://queue.fal.run/fal-ai/kling-video/requests/${requestId}`, {
          headers: { 'Authorization': `Key ${FAL_KEY}` }
        })
        const resultData = await resultRes.json()
        videoUrl = resultData.video?.url || resultData.data?.video?.url || ''
        break
      }
      if (statusData.status === 'FAILED') return res.status(500).json({ error: 'FAL failed: ' + JSON.stringify(statusData) })
      tries++
    }
    if (!videoUrl) return res.status(500).json({ error: 'Timeout - try again in 30s' })
    return res.status(200).json({ video: videoUrl })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}

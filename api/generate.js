export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { prompt, image } = req.body
    const FAL_KEY = process.env.FAL_KEY

    if (!FAL_KEY) {
      return res.status(500).json({ error: 'FAL_KEY missing in Vercel' })
    }

    const finalPrompt = prompt || 'cinematic motion, slow zoom, highly detailed, 8k'

    // نختارو الموديل
    let endpoint = ''
    let payload = {}

    if (image) {
      // عندك صورة -> Kling
      endpoint = 'https://queue.fal.run/fal-ai/kling-video/v2.1/master/image-to-video'
      payload = {
        prompt: finalPrompt,
        image_url: image,
        duration: "5",
        aspect_ratio: "16:9"
      }
    } else {
      // غير نص -> Minimax
      endpoint = 'https://queue.fal.run/fal-ai/minimax-video-01'
      payload = {
        prompt: finalPrompt,
        prompt_optimizer: true
      }
    }

    // Step 1: Submit
    const submitRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const submitData = await submitRes.json()
    if (!submitRes.ok) {
      console.error(submitData)
      return res.status(500).json({ error: JSON.stringify(submitData) })
    }

    const requestId = submitData.request_id
    const statusEndpoint = endpoint.includes('kling') 
      ? `https://queue.fal.run/fal-ai/kling-video/requests/${requestId}/status`
      : `https://queue.fal.run/fal-ai/minimax-video-01/requests/${requestId}/status`
    
    const resultEndpoint = endpoint.includes('kling')
      ? `https://queue.fal.run/fal-ai/kling-video/requests/${requestId}`
      : `https://queue.fal.run/fal-ai/minimax-video-01/requests/${requestId}`

    // Step 2: Poll حتى يكمل
    let tries = 0
    let videoUrl = ''
    while (tries < 40) {
      await new Promise(r => setTimeout(r, 3000))
      const sRes = await fetch(statusEndpoint, {
        headers: { 'Authorization': `Key ${FAL_KEY}` }
      })
      const sData = await sRes.json()
      
      if (sData.status === 'COMPLETED') {
        const rRes = await fetch(resultEndpoint, {
          headers: { 'Authorization': `Key ${FAL_KEY}` }
        })
        const rData = await rRes.json()
        videoUrl = rData.video?.url || rData.data?.video?.url || rData.video_url || ''
        break
      } else if (sData.status === 'FAILED') {
        return res.status(500).json({ error: 'Video generation failed', details: sData })
      }
      tries++
    }

    if (!videoUrl) {
      return res.status(500).json({ error: 'Timeout - try again' })
    }

    return res.status(200).json({ video: videoUrl })

  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'fetch failed: ' + e.message })
  }
          }

export async function GET() {
  try {
    const key = process.env.YOUTUBE_API_KEY
    if (!key) return Response.json({ error: 'No key' }, { status: 500 })

    const { createClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Check how many videos we already have
    const { count } = await (supabaseAdmin as any)
      .from('videos')
      .select('*', { count: 'exact', head: true })

    console.log(`Videos in DB: ${count}`)

    // Only fetch if we have less than 100 videos
    if (count && count >= 100) {
      return Response.json({
        success: true,
        message: 'DB has enough videos, skipping API call',
        videos_in_db: count,
        fetched: 0,
      })
    }

    // Step 2: Search YouTube for #shorts english learning content
    const queries = [
      'english learning #shorts',
      'learn english #shorts',
      'english speaking practice #shorts',
      'english phrases #shorts',
      'english vocabulary #shorts',
      'speak english #shorts',
      'english pronunciation #shorts',
      'daily english #shorts',
    ]

    const selected = queries.sort(() => Math.random() - 0.5).slice(0, 5)
    console.log('Selected queries:', selected)

    const results = await Promise.all(
      selected.map(q =>
        fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoDuration=short&q=${encodeURIComponent(q)}&key=${key}&maxResults=25&relevanceLanguage=en&videoEmbeddable=true&order=viewCount`
        )
          .then(r => r.json())
          .then(d => {
            if (d.error) console.error('Search API error:', d.error)
            return d.items || []
          })
          .catch(e => { console.error('Search fetch failed:', e); return [] })
      )
    )

    const allItems = results.flat()
    console.log(`Search returned ${allItems.length} total items`)

    // Deduplicate and filter bad content
    const bad = ['hindi', 'urdu', 'arabic', 'funny', 'comedy', 'prank', 'meme', 'vlog', 'reaction', 'bollywood', 'tamil', 'telugu', 'korean', 'japanese', 'chinese', 'french', 'spanish', 'german', 'movie', 'trailer', 'music', 'song', 'dance', 'news', 'politics', 'gaming', 'fortnite', 'minecraft']

    const seen = new Set<string>()
    const uniqueIds: string[] = []
    const snippetMap: Record<string, any> = {}

    for (const v of allItems) {
      const vid = v.id?.videoId
      if (!vid || seen.has(vid)) continue
      const title = (v.snippet?.title || '').toLowerCase()
      const channel = (v.snippet?.channelTitle || '').toLowerCase()
      if (bad.some(w => title.includes(w) || channel.includes(w))) {
        console.log(`FILTERED OUT (bad word): ${v.snippet?.title}`)
        continue
      }
      seen.add(vid)
      uniqueIds.push(vid)
      snippetMap[vid] = v.snippet
    }

    console.log(`After dedup + bad word filter: ${uniqueIds.length} candidates`)

    if (uniqueIds.length === 0) {
      return Response.json({ success: true, count: 0, message: 'No candidates found' })
    }

    // Step 3: Call Videos API to get contentDetails (duration) and status (embeddable)
    const batchSize = 50
    const allDetails: any[] = []

    for (let i = 0; i < uniqueIds.length; i += batchSize) {
      const batch = uniqueIds.slice(i, i + batchSize).join(',')
      const detailsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,status&id=${batch}&key=${key}`
      )
      const detailsData = await detailsRes.json()
      if (detailsData.error) {
        console.error('Videos API error:', detailsData.error)
        continue
      }
      if (detailsData.items) allDetails.push(...detailsData.items)
    }

    console.log(`Videos API returned details for ${allDetails.length} videos`)

    // Step 4: Parse duration and filter — log EVERY video
    function parseDuration(iso: string): number {
      if (!iso) return 9999
      // Handles: PT30S, PT1M, PT1M30S, PT3M34S, PT28M34S, PT1H2M3S
      const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
      if (!match) return 9999
      const h = parseInt(match[1] || '0')
      const m = parseInt(match[2] || '0')
      const s = parseInt(match[3] || '0')
      return h * 3600 + m * 60 + s
    }

    const videosToSave: any[] = []

    for (const v of allDetails) {
      const rawDuration = v.contentDetails?.duration || ''
      const duration = parseDuration(rawDuration)
      const embeddable = v.status?.embeddable === true
      const title = snippetMap[v.id]?.title || v.id
      const keep = embeddable && duration >= 5 && duration <= 180

      console.log(`Video: ${title} | Raw: ${rawDuration} | Duration: ${duration}s | Embeddable: ${embeddable} | KEEP: ${keep}`)

      if (keep) {
        videosToSave.push({
          video_id: v.id,
          title: snippetMap[v.id]?.title || '',
          thumbnail: snippetMap[v.id]?.thumbnails?.high?.url || '',
          channel: snippetMap[v.id]?.channelTitle || '',
          level: 'beginner',
        })
      }
    }

    console.log(`\n=== KEPT ${videosToSave.length} out of ${allDetails.length} videos (all under 60s) ===\n`)

    // Step 5: Save to DB
    if (videosToSave.length > 0) {
      const { error: upsertErr } = await (supabaseAdmin as any)
        .from('videos')
        .upsert(videosToSave, { onConflict: 'video_id' })
      if (upsertErr) console.error('Upsert error:', upsertErr)
    }

    // Step 6: Read back from DB and verify
    const { data: saved } = await (supabaseAdmin as any)
      .from('videos')
      .select('video_id, title')
      .order('created_at', { ascending: false })

    console.log(`\n=== VERIFIED: ${saved?.length || 0} videos in DB ===`)
    if (saved) {
      for (const v of saved) {
        console.log(`  DB: ${v.video_id} | ${v.title}`)
      }
    }

    return Response.json({
      success: true,
      count: videosToSave.length,
      saved_in_db: saved?.length || 0,
    })
  } catch (err) {
    console.error('Fetch error:', err)
    return Response.json({ error: 'Failed' }, { status: 500 })
  }
}

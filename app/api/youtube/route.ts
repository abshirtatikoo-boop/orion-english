import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    const { data: videos, error } = await supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('DB error:', error)
      return NextResponse.json({ videos: FALLBACK })
    }

    if (!videos || videos.length === 0) {
      return NextResponse.json({ videos: FALLBACK })
    }

    const shuffled = videos.sort(() => Math.random() - 0.5)

    return NextResponse.json({
      videos: shuffled.map((v: any) => ({
        id: v.video_id,
        title: v.title,
        thumbnail: v.thumbnail,
        channelTitle: v.channel,
      }))
    })
  } catch (err) {
    console.error('Video serve error:', err)
    return NextResponse.json({ videos: FALLBACK })
  }
}

const FALLBACK = [
  { id: 'dQw4w9WgXcQ', title: 'English Listening Practice', thumbnail: '', channelTitle: 'English Class' },
  { id: 'YBpdL9hSac4', title: 'Daily English Conversations', thumbnail: '', channelTitle: 'Learn English' },
  { id: '2OjCi5kXNYk', title: 'English Speaking Practice', thumbnail: '', channelTitle: 'BBC Learning' },
  { id: 'juKd26qkNAw', title: 'Common English Phrases', thumbnail: '', channelTitle: 'English Hub' },
  { id: 'ZjdBM7diWbY', title: 'English Vocabulary', thumbnail: '', channelTitle: 'Oxford English' },
]

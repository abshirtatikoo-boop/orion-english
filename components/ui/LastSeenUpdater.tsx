'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function LastSeenUpdater() {
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('users')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', user.id)
    })
  }, [])

  return null
}

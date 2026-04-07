'use client'

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { addCoins, COIN_REWARDS } from '@/lib/coins'
import { translateToSomali } from '@/lib/translation'

// Badhan kaydinta ereyga — Save vocabulary word button

interface Props {
  word: string
  source?: 'shadowing' | 'reading' | 'tiktok'
  userId: string
  onSaved?: (word: string, meaning: string) => void
}

type State = 'idle' | 'translating' | 'saved' | 'error' | 'duplicate'

export default function VocabSaveButton({ word, source = 'reading', userId, onSaved }: Props) {
  const [state, setState] = useState<State>('idle')
  const [meaning, setMeaning] = useState('')

  const handleSave = async () => {
    if (state === 'saved' || state === 'translating') return
    setState('translating')

    try {
      // 1. Translate to Somali
      const result = await translateToSomali(word)
      const somalMeaning = result.translatedText
      setMeaning(somalMeaning)

      // 2. Save to Supabase
      const supabase = createClient()
      const { error } = await supabase.from('saved_words').insert({
        user_id: userId,
        word,
        meaning_somali: somalMeaning,
        source,
      })

      if (error) {
        // Unique constraint violation — already saved
        if (error.code === '23505') {
          setState('duplicate')
        } else {
          throw error
        }
        return
      }

      // 3. Award coins
      await addCoins(userId, COIN_REWARDS.SAVE_WORD, `Saved word: ${word}`)

      setState('saved')
      onSaved?.(word, somalMeaning)
    } catch (err) {
      console.error('[VocabSaveButton] error:', err)
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }

  const label = {
    idle: '+ Save Word',
    translating: 'Saving...',
    saved: `✓ Saved — ${meaning}`,
    error: 'Try again',
    duplicate: 'Already saved',
  }[state]

  const colorMap: Record<State, React.CSSProperties> = {
    idle:        { background: 'rgba(139,92,246,0.1)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.3)' },
    translating: { background: 'rgba(255,255,255,0.1)', color: '#666666' },
    saved:       { background: '#0A2218', color: '#34D399', border: '1px solid rgba(52,211,153,0.3)' },
    error:       { background: '#2A0A0A', color: '#FF6B6B', border: '1px solid rgba(239,68,68,0.3)' },
    duplicate:   { background: 'rgba(255,255,255,0.04)', color: '#666666', border: '1px solid #2A2A2A' },
  }
  const colorStyle = colorMap[state]

  return (
    <button
      onClick={handleSave}
      disabled={state === 'translating' || state === 'saved' || state === 'duplicate'}
      className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
      style={colorStyle}
    >
      {state === 'translating' && (
        <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
      )}
      {label}
      {state === 'idle' && <span className="ml-1 font-bold" style={{ color: '#8B5CF6' }}>+{COIN_REWARDS.SAVE_WORD}</span>}
    </button>
  )
}

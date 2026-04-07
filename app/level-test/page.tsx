'use client'

// Imtixaanka heerka — Level test page

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Level = 'beginner' | 'intermediate' | 'advanced'

interface Question {
  id: number
  text: string
  options: string[]
  answer: number
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    text: 'She ___ a teacher.',
    options: ['are', 'am', 'is', 'be'],
    answer: 2,
  },
  {
    id: 2,
    text: 'Yesterday, I ___ to school by bus.',
    options: ['go', 'gone', 'went', 'going'],
    answer: 2,
  },
  {
    id: 3,
    text: 'How ___ does this bag cost?',
    options: ['many', 'much', 'more', 'most'],
    answer: 1,
  },
  {
    id: 4,
    text: 'I have lived here ___ five years.',
    options: ['since', 'ago', 'for', 'before'],
    answer: 2,
  },
  {
    id: 5,
    text: 'If I ___ rich, I would travel the world.',
    options: ['am', 'was', 'were', 'be'],
    answer: 2,
  },
]

function scoreToLevel(score: number): Level {
  if (score <= 1) return 'beginner'
  if (score <= 3) return 'intermediate'
  return 'advanced'
}

export default function LevelTestPage() {
  const router = useRouter()
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>(Array(QUESTIONS.length).fill(null))
  const [selected, setSelected] = useState<number | null>(null)

  const question = QUESTIONS[current]
  const progress = Math.round((current / QUESTIONS.length) * 100)
  const isLast = current === QUESTIONS.length - 1

  const handleSelect = (optionIdx: number) => {
    if (selected !== null) return
    setSelected(optionIdx)

    const newAnswers = [...answers]
    newAnswers[current] = optionIdx
    setAnswers(newAnswers)
  }

  const handleNext = () => {
    if (!isLast) {
      setCurrent(prev => prev + 1)
      setSelected(null)
      return
    }

    const finalAnswers = [...answers]
    finalAnswers[current] = selected
    const score = QUESTIONS.reduce((acc, q, i) => acc + (finalAnswers[i] === q.answer ? 1 : 0), 0)
    const level = scoreToLevel(score)

    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) {
        createClient().from('users').update({ level }).eq('id', user.id)
      }
    })

    router.push('/dashboard')
  }

  return (
    <div className="flex flex-col min-h-screen px-5 py-6" style={{ background: 'transparent' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-bold text-white">Level Test</h1>
          <p className="text-xs" style={{ color: '#999999' }}>5 quick questions</p>
        </div>
        <span className="text-sm font-semibold text-primary">
          {current + 1} / {QUESTIONS.length}
        </span>
      </div>

      {/* Progress */}
      <div className="h-2 rounded-full overflow-hidden mb-8" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question */}
      <div className="card mb-6">
        <p className="text-base font-medium leading-relaxed text-white">
          {question.text}
        </p>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-3 flex-1">
        {question.options.map((option, i) => {
          const isSelected = selected === i
          const isCorrect = i === question.answer
          const showResult = selected !== null

          let optionStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)', color: '#FFFFFF' }
          if (showResult) {
            if (isCorrect) optionStyle = { background: '#0A2218', borderColor: '#34D399', color: '#34D399' }
            else if (isSelected) optionStyle = { background: '#2A0A0A', borderColor: '#EF4444', color: '#FF6B6B' }
          }

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              className="w-full text-left px-4 py-3.5 rounded-card border-2 font-medium text-sm transition-all"
              style={optionStyle}
            >
              <span className="font-bold mr-3" style={{ color: '#666666' }}>
                {String.fromCharCode(65 + i)}.
              </span>
              {option}
              {showResult && isCorrect && <span className="float-right">·</span>}
              {showResult && isSelected && !isCorrect && <span className="float-right">✗</span>}
            </button>
          )
        })}
      </div>

      {/* Next button */}
      {selected !== null && (
        <div className="mt-6">
          <button onClick={handleNext} className="btn-primary w-full">
            {isLast ? 'Finish →' : 'Next →'}
          </button>
        </div>
      )}
    </div>
  )
}

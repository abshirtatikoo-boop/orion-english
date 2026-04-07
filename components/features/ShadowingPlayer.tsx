'use client'

// Dhagayso oo ku celceli — Pro shadowing player

import { useState, useRef, useEffect, useCallback } from 'react'
import { sentences as allSentences, type Level, type Sentence } from '@/lib/sentences'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SentenceResult {
  sentenceId: number
  accuracy: number          // 0-100
  spokenText: string
  attempts: number
}

interface WordScore {
  word: string
  hit: boolean
}

type Phase = 'idle' | 'countdown' | 'listening' | 'recording' | 'result' | 'done'
type Speed = 0.65 | 0.85 | 1.0

// ─── Accuracy helpers ─────────────────────────────────────────────────────────

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s']/g, '').trim()
}

function scoreAccuracy(target: string, spoken: string): { score: number; words: WordScore[] } {
  const targetWords = normalize(target).split(/\s+/)
  const spokenNorm = normalize(spoken)
  const spokenWords = new Set(spokenNorm.split(/\s+/))

  const words: WordScore[] = targetWords.map(w => ({ word: w, hit: spokenWords.has(w) }))
  const score = Math.round((words.filter(w => w.hit).length / words.length) * 100)
  return { score, words }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  level: Level
  onSentenceComplete?: (accuracy: number) => void
  onSessionComplete?: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ShadowingPlayer({ level, onSentenceComplete, onSessionComplete }: Props) {
  const sentenceList: Sentence[] = allSentences[level]

  const [currentIdx, setCurrentIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [speed, setSpeed] = useState<Speed>(0.85)
  const [countdown, setCountdown] = useState(3)
  const [spokenText, setSpokenText] = useState('')
  const [lastWords, setLastWords] = useState<WordScore[]>([])
  const [lastScore, setLastScore] = useState<number | null>(null)
  const [results, setResults] = useState<Map<number, SentenceResult>>(new Map())
  const [showSomali, setShowSomali] = useState(false)
  const [autoAdvance, setAutoAdvance] = useState(false)
  const [micLevel, setMicLevel] = useState(0)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const micAnimRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentSentence = sentenceList[currentIdx]
  const totalSentences = sentenceList.length
  const completedCount = results.size

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel()
      recognitionRef.current?.abort()
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
      if (micAnimRef.current) clearInterval(micAnimRef.current)
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current)
    }
  }, [])

  // ── Reset when level changes ──
  useEffect(() => {
    window.speechSynthesis?.cancel()
    recognitionRef.current?.abort()
    setCurrentIdx(0)
    setPhase('idle')
    setSpokenText('')
    setLastWords([])
    setLastScore(null)
    setResults(new Map())
    setShowSomali(false)
  }, [level])

  // ── TTS speak ──
  const speak = useCallback((text: string, rate: Speed) => {
    if (!('speechSynthesis' in window)) return

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = rate
    utterance.lang = 'en-US'
    utterance.pitch = 1.0

    // Prefer a clear English voice if available
    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find(v =>
      v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel'))
    ) ?? voices.find(v => v.lang.startsWith('en-US'))
    if (preferred) utterance.voice = preferred

    utterance.onend = () => {
      setPhase('idle')   // Ready to record
    }

    setPhase('listening')
    window.speechSynthesis.speak(utterance)
  }, [])

  // ── Countdown then record ──
  const startCountdown = useCallback(() => {
    setPhase('countdown')
    setCountdown(3)

    let c = 3
    countdownTimerRef.current = setInterval(() => {
      c -= 1
      setCountdown(c)
      if (c <= 0) {
        clearInterval(countdownTimerRef.current!)
        startRecording()
      }
    }, 900)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Speech recognition ──
  const startRecording = useCallback(() => {
    // SpeechRecognition types aren't in TS default lib — use unknown ctor pattern
    type SR = {
      lang: string; interimResults: boolean; maxAlternatives: number
      onresult: ((e: Event) => void) | null
      onend: (() => void) | null
      onerror: (() => void) | null
      start(): void; stop(): void; abort(): void
    }
    type SRCtor = { new(): SR }

    const win = window as Window & { webkitSpeechRecognition?: SRCtor; SpeechRecognition?: SRCtor }
    const SpeechRecognitionCtor: SRCtor | undefined = win.webkitSpeechRecognition ?? win.SpeechRecognition

    if (!SpeechRecognitionCtor) {
      alert('Speech recognition not supported. Please use Chrome or Edge.')
      setPhase('idle')
      return
    }

    const recognition = new SpeechRecognitionCtor()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 3
    recognitionRef.current = recognition

    setPhase('recording')
    setSpokenText('')

    // Animate mic level
    micAnimRef.current = setInterval(() => {
      setMicLevel(Math.random())
    }, 120)

    recognition.onresult = (event: Event) => {
      // SpeechRecognitionEvent is not in TS default lib — cast manually
      const e = event as Event & {
        results: { length: number; [i: number]: { length: number; [j: number]: { transcript: string; confidence: number } } }
      }
      // Pick the most confident alternative
      let best = ''
      let bestConf = 0
      for (let i = 0; i < e.results[0].length; i++) {
        const alt = e.results[0][i]
        if (alt.confidence > bestConf) {
          bestConf = alt.confidence
          best = alt.transcript
        }
      }
      setSpokenText(best)
    }

    recognition.onend = () => {
      clearInterval(micAnimRef.current!)
      setMicLevel(0)

      // Score will be set in the effect below when spokenText updates
      setPhase('result')
    }

    recognition.onerror = () => {
      clearInterval(micAnimRef.current!)
      setMicLevel(0)
      setPhase('idle')
    }

    recognition.start()
  }, [])

  // ── Process result after spokenText + phase='result' ──
  useEffect(() => {
    if (phase !== 'result') return

    const target = currentSentence.text
    const { score, words } = scoreAccuracy(target, spokenText)
    setLastScore(score)
    setLastWords(words)

    // Update best result for this sentence
    setResults(prev => {
      const existing = prev.get(currentSentence.id)
      const attempts = (existing?.attempts ?? 0) + 1
      if (!existing || score > existing.accuracy) {
        const next = new Map(prev)
        next.set(currentSentence.id, { sentenceId: currentSentence.id, accuracy: score, spokenText, attempts })
        return next
      }
      // Still increment attempts even if not best
      const next = new Map(prev)
      next.set(currentSentence.id, { ...existing, attempts })
      return next
    })

    onSentenceComplete?.(score)

    // Auto-advance after 2.5 s if enabled
    if (autoAdvance && score >= 60) {
      autoAdvanceTimerRef.current = setTimeout(() => handleNext(true), 2500)
    }
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigate ──
  const handleNext = useCallback((fromAuto = false) => {
    if (!fromAuto && autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current)
    }
    window.speechSynthesis.cancel()
    recognitionRef.current?.abort()
    setPhase('idle')
    setSpokenText('')
    setLastWords([])
    setLastScore(null)
    setShowSomali(false)

    if (currentIdx < totalSentences - 1) {
      setCurrentIdx(prev => prev + 1)
    } else {
      setPhase('done')
      onSessionComplete?.()
    }
  }, [currentIdx, totalSentences, onSessionComplete])

  const handlePrev = () => {
    if (currentIdx === 0) return
    window.speechSynthesis.cancel()
    recognitionRef.current?.abort()
    setPhase('idle')
    setSpokenText('')
    setLastWords([])
    setLastScore(null)
    setShowSomali(false)
    setCurrentIdx(prev => prev - 1)
  }

  const handleRestart = () => {
    window.speechSynthesis.cancel()
    recognitionRef.current?.abort()
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current)
    setCurrentIdx(0)
    setPhase('idle')
    setSpokenText('')
    setLastWords([])
    setLastScore(null)
    setResults(new Map())
    setShowSomali(false)
  }

  // ── Retry same sentence ──
  const handleRetry = () => {
    setPhase('idle')
    setSpokenText('')
    setLastWords([])
    setLastScore(null)
  }

  // ── Average score ──
  const avgScore = results.size > 0
    ? Math.round([...results.values()].reduce((a, r) => a + r.accuracy, 0) / results.size)
    : 0

  const scoreColor = (s: number) =>
    s >= 80 ? '#34D399' : s >= 50 ? '#8B5CF6' : '#EF4444'

  const scoreBg = (s: number) =>
    s >= 80 ? '#0A2218' : s >= 50 ? 'rgba(139,92,246,0.1)' : '#2A0A0A'

  const scoreLabel = (s: number) =>
    s >= 90 ? 'Excellent!' : s >= 75 ? 'Great job!' : s >= 50 ? 'Good try!' : 'Keep practicing!'

  // ─── Done screen ──────────────────────────────────────────────────────────

  if (phase === 'done') {
    return (
      <div className="flex flex-col gap-5">
        <div className="card flex flex-col items-center text-center py-6">
          <div className="text-5xl mb-3">🎉</div>
          <h2 className="text-xl font-bold text-white">Session Complete!</h2>
          <p className="text-sm mt-1" style={{ color: '#999999' }}>Waxbarashadaada ayaa dhammaysay</p>

          <div
            className="mt-5 w-24 h-24 rounded-full flex flex-col items-center justify-center"
            style={{ background: scoreBg(avgScore), border: `3px solid ${scoreColor(avgScore)}` }}
          >
            <span className="text-3xl font-extrabold" style={{ color: scoreColor(avgScore) }}>
              {avgScore}%
            </span>
            <span className="text-xs" style={{ color: '#999999' }}>avg score</span>
          </div>

          <p className="mt-4 font-semibold text-white">{scoreLabel(avgScore)}</p>
          <p className="text-xs mt-1" style={{ color: '#999999' }}>{completedCount} sentences completed</p>
        </div>

        {/* Per-sentence results */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#666666' }}>Results</p>
          {sentenceList.map((s, i) => {
            const r = results.get(s.id)
            return (
              <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <span className="text-xs w-4" style={{ color: '#666666' }}>{i + 1}</span>
                <p className="flex-1 text-sm truncate text-white">{s.text}</p>
                {r ? (
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ color: scoreColor(r.accuracy), background: scoreBg(r.accuracy) }}
                  >
                    {r.accuracy}%
                  </span>
                ) : (
                  <span className="text-xs flex-shrink-0" style={{ color: '#444' }}>—</span>
                )}
              </div>
            )
          })}
        </div>

        <button onClick={handleRestart} className="btn-primary w-full">
          ↺ Practice Again
        </button>
      </div>
    )
  }

  // ─── Main player ──────────────────────────────────────────────────────────

  const progressPct = Math.round((completedCount / totalSentences) * 100)
  const currentResult = results.get(currentSentence.id)

  return (
    <div className="flex flex-col gap-4">

      {/* ── Top controls row ── */}
      <div className="flex items-center justify-between">
        {/* Speed selector */}
        <div className="flex items-center gap-1 rounded-full p-0.5" style={{ background: 'rgba(255,255,255,0.1)' }}>
          {([0.65, 0.85, 1.0] as Speed[]).map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className="text-xs font-semibold px-2.5 py-1 rounded-full transition-colors"
              style={speed === s
                ? { background: '#8B5CF6', color: '#000000' }
                : { color: '#999999' }
              }
            >
              {s === 0.65 ? '🐢 Slow' : s === 0.85 ? '🚶 Normal' : '⚡ Fast'}
            </button>
          ))}
        </div>

        {/* Auto-advance toggle */}
        <button
          onClick={() => setAutoAdvance(v => !v)}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
          style={autoAdvance
            ? { background: '#8B5CF6', color: '#000000' }
            : { background: 'rgba(255,255,255,0.1)', color: '#999999' }
          }
        >
          <span>{autoAdvance ? '⚡' : '⏸'}</span>
          Auto
        </button>
      </div>

      {/* ── Progress ── */}
      <div>
        <div className="flex justify-between text-xs mb-1.5" style={{ color: '#666666' }}>
          <span>{completedCount}/{totalSentences} completed</span>
          {avgScore > 0 && (
            <span style={{ color: scoreColor(avgScore) }}>Avg: {avgScore}%</span>
          )}
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%`, background: '#8B5CF6' }}
          />
        </div>
      </div>

      {/* ── Sentence card ── */}
      <div
        className="rounded-card border-2 p-5 transition-all"
        style={{
          borderColor: phase === 'recording' ? '#EF4444' : phase === 'result' && lastScore !== null ? scoreColor(lastScore) : 'rgba(255,255,255,0.1)',
          background: phase === 'result' && lastScore !== null ? scoreBg(lastScore) : 'rgba(255,255,255,0.06)',
        }}
      >
        {/* Phase label */}
        <div className="flex items-center justify-between mb-3">
          <PhaseLabel phase={phase} countdown={countdown} />
          {currentResult && (
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ color: scoreColor(currentResult.accuracy), background: 'rgba(255,255,255,0.04)' }}
            >
              Best: {currentResult.accuracy}%
            </span>
          )}
        </div>

        {/* Target sentence — word-highlighted in result phase */}
        {phase === 'result' && lastWords.length > 0 ? (
          <div className="text-lg leading-relaxed flex flex-wrap gap-x-1.5 gap-y-0.5">
            {lastWords.map((w, i) => (
              <span
                key={i}
                className="font-medium"
                style={{ color: w.hit ? '#34D399' : '#EF4444' }}
              >
                {w.word}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-lg text-white leading-relaxed font-medium">
            {currentSentence.text}
          </p>
        )}

        {/* Somali translation toggle */}
        <button
          onClick={() => setShowSomali(v => !v)}
          className="mt-3 text-xs underline underline-offset-2" style={{ color: '#666666' }}
        >
          {showSomali ? 'Hide Somali' : 'Show Somali (Turjumad)'}
        </button>
        {showSomali && (
          <p className="mt-1.5 text-sm italic" style={{ color: '#999999' }}>{currentSentence.somali}</p>
        )}

        {/* Result: spoken text */}
        {phase === 'result' && spokenText && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            <p className="text-xs mb-1" style={{ color: '#666666' }}>You said:</p>
            <p className="text-sm italic" style={{ color: '#cccccc' }}>"{spokenText}"</p>
          </div>
        )}

        {/* Result: score ring */}
        {phase === 'result' && lastScore !== null && (
          <div className="mt-3 flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: scoreBg(lastScore), border: `2px solid ${scoreColor(lastScore)}` }}
            >
              <span className="font-extrabold text-sm" style={{ color: scoreColor(lastScore) }}>
                {lastScore}%
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: scoreColor(lastScore) }}>
                {scoreLabel(lastScore)}
              </p>
              {lastScore < 60 && (
                <p className="text-xs" style={{ color: '#999999' }}>Try again for a better score</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Mic waveform (recording phase) ── */}
      {phase === 'recording' && (
        <div className="flex items-center justify-center gap-1 h-10">
          {Array.from({ length: 18 }).map((_, i) => (
            <div
              key={i}
              className="w-1 rounded-full bg-red-400 transition-all"
              style={{
                height: `${8 + micLevel * 28 * Math.sin((i / 17) * Math.PI) * (0.5 + Math.random() * 0.5)}px`,
                opacity: 0.6 + micLevel * 0.4,
              }}
            />
          ))}
        </div>
      )}

      {/* ── Action buttons ── */}
      <div className="flex gap-3">
        {/* Listen */}
        {(phase === 'idle' || phase === 'result') && (
          <button
            onClick={() => speak(currentSentence.text, speed)}
            className="flex-1 btn-primary flex items-center justify-center gap-2 py-3"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0">
              <path d="M8 5v14l11-7z" />
            </svg>
            Listen
          </button>
        )}

        {phase === 'listening' && (
          <button
            disabled
            className="flex-1 btn-primary flex items-center justify-center gap-2 py-3 opacity-80"
          >
            <SoundWaveIcon />
            Playing…
          </button>
        )}

        {/* Repeat / Countdown */}
        {phase === 'idle' && (
          <button
            onClick={startCountdown}
            className="flex-1 font-semibold py-3 px-4 rounded-btn flex items-center justify-center gap-2 border-2 border-primary text-primary"
          >
            🎤 Repeat
          </button>
        )}

        {phase === 'countdown' && (
          <div className="flex-1 font-semibold py-3 rounded-btn flex items-center justify-center gap-2 border-2" style={{ background: 'rgba(139,92,246,0.1)', borderColor: '#8B5CF6', color: '#8B5CF6' }}>
            <span className="text-2xl font-extrabold">{countdown}</span>
            <span className="text-sm">Get ready…</span>
          </div>
        )}

        {phase === 'recording' && (
          <button
            onClick={() => { recognitionRef.current?.stop() }}
            className="flex-1 font-semibold py-3 px-4 rounded-btn flex items-center justify-center gap-2 bg-red-500 text-white"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
            Recording… (tap to stop)
          </button>
        )}

        {phase === 'result' && (
          <button
            onClick={handleRetry}
            className="flex-1 font-semibold py-3 px-4 rounded-btn flex items-center justify-center gap-2 border-2"
            style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#999999' }}
          >
            ↺ Try Again
          </button>
        )}
      </div>

      {/* ── Navigation row ── */}
      <div className="flex gap-2">
        <button
          onClick={handlePrev}
          disabled={currentIdx === 0}
          className="px-4 py-2.5 rounded-btn text-sm font-medium disabled:opacity-30"
          style={{ background: 'rgba(255,255,255,0.1)', color: '#999999' }}
        >
          ← Prev
        </button>

        {/* Sentence list scroll dots */}
        <div className="flex-1 flex items-center justify-center gap-1 overflow-hidden px-1">
          {sentenceList.map((s, i) => {
            const r = results.get(s.id)
            return (
              <button
                key={s.id}
                onClick={() => {
                  window.speechSynthesis.cancel()
                  setCurrentIdx(i)
                  setPhase('idle')
                  setSpokenText('')
                  setLastWords([])
                  setLastScore(null)
                  setShowSomali(false)
                }}
                className="flex-shrink-0 transition-all"
                title={s.text}
              >
                <div
                  className="rounded-full transition-all"
                  style={{
                    width: i === currentIdx ? '20px' : '8px',
                    height: '8px',
                    background: r
                      ? scoreColor(r.accuracy)
                      : i === currentIdx
                      ? '#8B5CF6'
                      : 'rgba(255,255,255,0.1)',
                  }}
                />
              </button>
            )
          })}
        </div>

        <button
          onClick={() => handleNext(false)}
          className="px-4 py-2.5 rounded-btn text-sm font-medium bg-primary text-black"
        >
          Next →
        </button>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PhaseLabel({ phase, countdown }: { phase: Phase; countdown: number }) {
  const config: Record<Phase, { label: string; color: string; bg: string }> = {
    idle: { label: 'READY', color: '#999999', bg: 'rgba(255,255,255,0.04)' },
    countdown: { label: `GET READY — ${countdown}`, color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
    listening: { label: 'LISTEN CAREFULLY', color: '#34D399', bg: '#0A2218' },
    recording: { label: 'YOUR TURN — SPEAK NOW', color: '#EF4444', bg: '#2A0A0A' },
    result: { label: 'RESULT', color: '#999999', bg: 'rgba(255,255,255,0.04)' },
    done: { label: 'DONE', color: '#34D399', bg: '#0A2218' },
  }
  const c = config[phase]
  return (
    <span
      className="text-[11px] font-extrabold tracking-widest px-2.5 py-1 rounded-full"
      style={{ color: c.color, background: c.bg }}
    >
      {c.label}
    </span>
  )
}

function SoundWaveIcon() {
  return (
    <span className="flex gap-0.5 items-end h-4">
      {[2, 4, 3, 4, 2].map((h, i) => (
        <span
          key={i}
          className="w-0.5 rounded-full bg-white animate-bounce"
          style={{ height: `${h * 3}px`, animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </span>
  )
}

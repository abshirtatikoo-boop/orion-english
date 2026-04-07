'use client'

// Daaqadda AI-ga — AI chat window (level-aware, pedagogically smart)

import { useState, useRef, useEffect } from 'react'
import type { ChatMessage, ChatLevel } from '@/lib/claude'
import { sendChatMessage } from '@/lib/claude'
import { addCoins, COIN_REWARDS } from '@/lib/coins'

interface Props {
  userId: string
  dailyMessagesUsed?: number
  dailyLimit?: number
  level?: ChatLevel
}

const DAILY_LIMIT_FREE = 10

const CONVERSATION_STARTERS: { label: string; emoji: string }[] = [
  { label: 'Talk about my day', emoji: '☀️' },
  { label: 'Practice job interview', emoji: '💼' },
  { label: 'Learn new phrases', emoji: '' },
  { label: 'Correct my English', emoji: '✏️' },
]

const QUICK_REPLIES = ["Tell me more", "I don't understand", "Can you repeat?"]

// ─── Render AI message with correction highlights ──────────────────────────

function MessageContent({ content }: { content: string }) {
  const lines = content.split('\n')
  return (
    <div>
      {lines.map((line, i) => {
        const isBetter = line.startsWith('✓ Better:') || line.startsWith('✓ Better :')
        const isTip    = line.startsWith('💡 Tip:')   || line.startsWith('💡 Tip :')

        if (isBetter) {
          return (
            <div
              key={i}
              className="mt-2 rounded-lg px-3 py-2 text-xs font-semibold leading-relaxed"
              style={{ background: '#0A2218', border: '1px solid #34D39940', color: '#34D399' }}
            >
              {line}
            </div>
          )
        }
        if (isTip) {
          return (
            <div
              key={i}
              className="mt-2 rounded-lg px-3 py-2 text-xs font-semibold leading-relaxed"
              style={{ background: '#0F1C2E', border: '1px solid #60A5FA40', color: '#60A5FA' }}
            >
              {line}
            </div>
          )
        }
        if (line === '') return <div key={i} className="h-1" />
        return <p key={i} className={i > 0 ? 'mt-1' : ''}>{line}</p>
      })}
    </div>
  )
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AIChatWindow({
  userId,
  dailyMessagesUsed = 0,
  dailyLimit = DAILY_LIMIT_FREE,
  level = 'beginner',
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Salaam! I'm Orion, your English teacher. How can I help you today? (Sideed kaa caawin karaa maanta?)",
    },
  ])
  const [input, setInput]                     = useState('')
  const [loading, setLoading]                 = useState(false)
  const [used, setUsed]                       = useState(dailyMessagesUsed)
  const [showQuickReplies, setShowQuickReplies] = useState(false)
  const [coinAnim, setCoinAnim]               = useState(false)
  const bottomRef   = useRef<HTMLDivElement>(null)
  const inputRef    = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    if (used >= dailyLimit) return

    const userMsg: ChatMessage = { role: 'user', content: trimmed }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setUsed(prev => prev + 1)
    setShowQuickReplies(false)

    // Brief coin animation
    setCoinAnim(true)
    setTimeout(() => setCoinAnim(false), 1600)

    try {
      // Exclude the initial greeting from history to save tokens
      const history = [...messages.slice(1), userMsg]
      const reply = await sendChatMessage(history, level)

      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      setShowQuickReplies(true)

      await addCoins(userId, COIN_REWARDS.AI_CHAT_MESSAGE, 'AI chat message')
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "Sorry, I'm having trouble connecting. Please try again. (Raali noqo, isku day mar kale.)",
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  const remaining     = dailyLimit - used
  const limitReached  = used >= dailyLimit
  const showStarters  = messages.length === 1 && !limitReached

  return (
    <div className="flex flex-col h-full relative">

      {/* ── Coin earned animation ── */}
      {coinAnim && (
        <div
          className="absolute top-0 right-0 z-20 pointer-events-none"
          style={{ animation: 'fadeUpOut 1.6s ease forwards' }}
        >
          <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ color: '#8B5CF6', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)' }}>
            +{COIN_REWARDS.AI_CHAT_MESSAGE} 
          </span>
        </div>
      )}

      {/* ── Message list ── */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 pb-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                <span className="text-black text-xs font-bold">O</span>
              </div>
            )}
            <div
              className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
              style={msg.role === 'user'
                ? { background: '#8B5CF6', color: '#000000', borderBottomRightRadius: '4px' }
                : { background: 'rgba(255,255,255,0.1)', color: '#FFFFFF', borderBottomLeftRadius: '4px' }
              }
            >
              {msg.role === 'assistant'
                ? <MessageContent content={msg.content} />
                : msg.content
              }
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mr-2">
              <span className="text-black text-xs font-bold">O</span>
            </div>
            <div className="rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
              {[0, 1, 2].map(j => (
                <span
                  key={j}
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{ background: '#666666', animationDelay: `${j * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Conversation starters (first visit only) ── */}
      {showStarters && (
        <div className="grid grid-cols-2 gap-2 mb-3 flex-shrink-0">
          {CONVERSATION_STARTERS.map(s => (
            <button
              key={s.label}
              onClick={() => send(s.label)}
              className="text-left rounded-card p-3 text-xs font-medium transition-colors text-white"
              style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)' }}
            >
              <span className="text-lg block mb-1">{s.emoji}</span>
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Quick replies after each AI message ── */}
      {showQuickReplies && !loading && !limitReached && (
        <div className="flex gap-2 overflow-x-auto pb-2 flex-shrink-0 -mx-1 px-1 scrollbar-hide">
          {QUICK_REPLIES.map(r => (
            <button
              key={r}
              onClick={() => send(r)}
              className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full text-primary font-medium whitespace-nowrap"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(139,92,246,0.3)' }}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {/* ── Input area / limit banner ── */}
      {limitReached ? (
        <div className="rounded-card p-4 text-center flex-shrink-0" style={{ background: '#1A1200', border: '1px solid #3A2A00' }}>
          <p className="text-2xl mb-1">🔒</p>
          <p className="font-semibold text-sm" style={{ color: '#8B5CF6' }}>
            Daily limit reached ({dailyLimit} messages)
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#999999' }}>
            Upgrade to Premium for unlimited AI chat
          </p>
          <button className="mt-3 text-black text-xs font-bold px-5 py-2 rounded-full bg-primary">
            Upgrade to Premium
          </button>
        </div>
      ) : (
        <div className="flex-shrink-0">
          {/* Remaining messages counter */}
          {dailyLimit < 999 && (
            <p className="text-center text-xs mb-1.5" style={{ color: '#666666' }}>
              {remaining} message{remaining !== 1 ? 's' : ''} left today
            </p>
          )}
          <div className="flex items-end gap-2 rounded-2xl p-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #2A2A2A' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about English…"
              rows={1}
              className="flex-1 bg-transparent text-sm resize-none outline-none px-2 py-1 max-h-32 text-white placeholder:text-[#555]"
              style={{ minHeight: '36px' }}
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-full bg-primary text-black flex items-center justify-center disabled:opacity-40 transition-opacity flex-shrink-0"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 rotate-90">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Keyframe for coin animation */}
      <style>{`
        @keyframes fadeUpOut {
          0%   { opacity: 1; transform: translateY(0);     }
          70%  { opacity: 1; transform: translateY(-20px); }
          100% { opacity: 0; transform: translateY(-32px); }
        }
      `}</style>
    </div>
  )
}

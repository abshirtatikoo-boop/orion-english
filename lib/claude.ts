// Client-side helper — calls our own /api/chat route (keeps API key server-side)

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export type ChatLevel = 'beginner' | 'intermediate' | 'advanced'

export async function sendChatMessage(
  messages: ChatMessage[],
  level?: ChatLevel,
): Promise<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, level }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(err || 'Failed to get AI response')
  }

  const data = await response.json() as { content: string }
  return data.content
}

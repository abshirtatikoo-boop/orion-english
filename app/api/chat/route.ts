import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPTS = {
  beginner: `You are an English tutor for Somali speakers at BEGINNER level.
RULES:
- Use ONLY simple words (A1-A2 level). Max sentence length: 8 words.
- NEVER use phrasal verbs or idioms.
- After each user message, give ONE gentle correction if needed.
- Format corrections like: "✓ Better: [corrected sentence]"
- Always encourage. End every message with a simple question to keep conversation going.
- Topics: daily life, family, food, weather, greetings only.
- If user writes in Somali, respond in English but acknowledge you understood.`,

  intermediate: `You are an English tutor for Somali speakers at INTERMEDIATE level.
RULES:
- Use B1-B2 vocabulary. Normal conversational sentences.
- Correct grammar mistakes clearly: "💡 Tip: Use past perfect here → [example]"
- Introduce ONE new phrase per conversation naturally.
- Topics: work, travel, opinions, news, plans, descriptions.
- Ask follow-up questions to extend conversation.
- Occasionally challenge them: "Can you say that using 'however'?"`,

  advanced: `You are an English tutor for Somali speakers at ADVANCED level.
RULES:
- Use sophisticated vocabulary and complex structures freely.
- Focus on: nuance, tone, formality levels, idioms, collocations.
- Corrections focus on style, not just grammar: "That works, but 'paramount' would be stronger here."
- Discuss: current events, abstract ideas, professional scenarios.
- Push for precision: "What exactly do you mean by 'good'? Be specific."
- Treat them as near-fluent — high standards expected.`,
}

type Level = keyof typeof SYSTEM_PROMPTS

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      messages: { role: 'user' | 'assistant'; content: string }[]
      level?: Level
    }

    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const systemPrompt = SYSTEM_PROMPTS[body.level ?? 'beginner']

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: body.messages,
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response type' }, { status: 500 })
    }

    return NextResponse.json({ content: content.text })
  } catch (err) {
    console.error('[api/chat] error:', err)
    return NextResponse.json(
      { error: 'Failed to get AI response' },
      { status: 500 },
    )
  }
}

// Turjumid Ingiriisi → Soomaali (English → Somali translation)
// Uses the free MyMemory API (no key required for basic usage)

const MYMEMORY_URL = 'https://api.mymemory.translated.net/get'

export interface TranslationResult {
  translatedText: string
  confidence: number
}

export async function translateToSomali(text: string): Promise<TranslationResult> {
  if (!text.trim()) return { translatedText: '', confidence: 0 }

  try {
    const url = `${MYMEMORY_URL}?q=${encodeURIComponent(text)}&langpair=en|so`
    const response = await fetch(url)

    if (!response.ok) throw new Error('Translation API error')

    const data = await response.json() as {
      responseData: { translatedText: string; match: number }
      responseStatus: number
    }

    if (data.responseStatus !== 200) throw new Error('Translation failed')

    return {
      translatedText: data.responseData.translatedText,
      confidence: data.responseData.match,
    }
  } catch (err) {
    console.error('[translation] error:', err)
    return { translatedText: text, confidence: 0 }
  }
}

export async function translateToEnglish(text: string): Promise<TranslationResult> {
  if (!text.trim()) return { translatedText: '', confidence: 0 }

  try {
    const url = `${MYMEMORY_URL}?q=${encodeURIComponent(text)}&langpair=so|en`
    const response = await fetch(url)
    if (!response.ok) throw new Error('Translation API error')

    const data = await response.json() as {
      responseData: { translatedText: string; match: number }
      responseStatus: number
    }

    return {
      translatedText: data.responseData.translatedText,
      confidence: data.responseData.match,
    }
  } catch {
    return { translatedText: text, confidence: 0 }
  }
}

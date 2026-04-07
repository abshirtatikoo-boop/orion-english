import { createClient } from './supabase'

type SupabaseClient = ReturnType<typeof createClient>

// ─── Send a notification row ──────────────────────────────────────────────────

export async function sendNotification(
  supabase: SupabaseClient,
  userId: string,
  type: string,
  title: string,
  body: string,
  data: Record<string, unknown> = {}
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('notifications').insert({
    user_id: userId,
    type,
    title,
    body,
    data,
  })
  if (error) console.error('[sendNotification]', error.message)
}

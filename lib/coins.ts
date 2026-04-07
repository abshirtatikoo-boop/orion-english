import { createClient } from './supabase'
import { sendNotification } from './notifications'

// ─── Coin reward constants ────────────────────────────────────────────────────
// Lacagta abaalmarka ah (reward amounts in coins)

export const COIN_REWARDS = {
  SAVE_WORD: 5,           // Saving a new vocabulary word
  COMPLETE_SHADOWING: 20, // Finishing a shadowing session
  AI_CHAT_MESSAGE: 2,     // Each AI chat message sent
  DAILY_LOGIN: 10,        // Daily login bonus
} as const

export type CoinReason = keyof typeof COIN_REWARDS

// ─── Add coins and log transaction ───────────────────────────────────────────

export async function addCoins(
  userId: string,
  amount: number,
  reason: string,
): Promise<{ newBalance: number } | null> {
  const supabase = createClient()

  // 1. Log the transaction
  const { error: txError } = await supabase.from('coin_transactions').insert({
    user_id: userId,
    amount,
    reason,
  })

  if (txError) {
    console.error('[coins] transaction insert error:', txError.message)
    return null
  }

  // 2. Read current balance
  const { data: user, error: readError } = await supabase
    .from('users')
    .select('coins')
    .eq('id', userId)
    .single()

  if (readError || !user) {
    console.error('[coins] user read error:', readError?.message)
    return null
  }

  // 3. Increment balance
  const newBalance = user.coins + amount
  const { error: updateError } = await supabase
    .from('users')
    .update({ coins: newBalance })
    .eq('id', userId)

  if (updateError) {
    console.error('[coins] balance update error:', updateError.message)
    return null
  }

  // Notify user — skip tiny AI chat rewards to avoid spam
  if (amount >= 5) {
    await sendNotification(supabase, userId, 'task_complete', 'Task complete!', `+${amount} coins — ${reason}`, { coins: amount })
  }

  return { newBalance }
}

// ─── Get current coin balance ─────────────────────────────────────────────────

export async function getBalance(userId: string): Promise<number> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('users')
    .select('coins')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('[coins] getBalance error:', error.message)
    return 0
  }

  return data?.coins ?? 0
}

// ─── Daily login bonus (idempotent — one per day) ────────────────────────────

export async function claimDailyLoginBonus(userId: string): Promise<boolean> {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

  const { data: user } = await supabase
    .from('users')
    .select('last_active, streak')
    .eq('id', userId)
    .single()

  if (!user) return false
  if (user.last_active === today) return false // already claimed today

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  const newStreak = user.last_active === yesterdayStr ? (user.streak ?? 0) + 1 : 1

  await supabase
    .from('users')
    .update({ last_active: today, streak: newStreak })
    .eq('id', userId)

  await addCoins(userId, COIN_REWARDS.DAILY_LOGIN, 'Daily login bonus')
  return true
}

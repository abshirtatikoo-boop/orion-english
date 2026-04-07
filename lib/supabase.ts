import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// ─── Database types ───────────────────────────────────────────────────────────

export interface UserRow {
  id: string
  email: string
  name: string | null
  level: 'beginner' | 'intermediate' | 'advanced'
  coins: number
  streak: number
  last_active: string | null
  is_premium: boolean
  created_at: string
  avatar_url?: string | null
  avatar_updated_at?: string | null
  username?: string | null
  username_updated_at?: string | null
  country?: string | null
  last_seen?: string | null
  name_updated_at?: string | null
  public_id?: string | null
}

export interface FollowRow {
  id: string
  follower_id: string
  following_id: string
  created_at: string
}

export interface DirectMessageRow {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
  expires_at: string
}

export interface SavedWordRow {
  id: string
  user_id: string
  word: string
  meaning_somali: string | null
  source: 'shadowing' | 'reading' | 'tiktok' | null
  created_at: string
}

export interface CoinTransactionRow {
  id: string
  user_id: string
  amount: number
  reason: string
  created_at: string
}

export interface GroupRow {
  id: string
  name: string
  level: string | null
  is_premium: boolean
  member_count: number
  created_at: string
}

export interface GroupMessageRow {
  id: string
  group_id: string
  user_id: string
  content: string
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      users: {
        Row: UserRow
        Insert: Omit<UserRow, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<UserRow>
      }
      saved_words: {
        Row: SavedWordRow
        Insert: Omit<SavedWordRow, 'id' | 'created_at'>
        Update: Partial<SavedWordRow>
      }
      coin_transactions: {
        Row: CoinTransactionRow
        Insert: Omit<CoinTransactionRow, 'id' | 'created_at'>
        Update: Partial<CoinTransactionRow>
      }
      groups: {
        Row: GroupRow
        Insert: Omit<GroupRow, 'id' | 'created_at'>
        Update: Partial<GroupRow>
      }
      group_messages: {
        Row: GroupMessageRow
        Insert: Omit<GroupMessageRow, 'id' | 'created_at'>
        Update: Partial<GroupMessageRow>
      }
      follows: {
        Row: FollowRow
        Insert: Omit<FollowRow, 'id' | 'created_at'>
        Update: Partial<FollowRow>
      }
      direct_messages: {
        Row: DirectMessageRow
        Insert: Omit<DirectMessageRow, 'id' | 'created_at' | 'expires_at'>
        Update: Partial<DirectMessageRow>
      }
    }
  }
}

// ─── Client factory (call inside Client Components only) ──────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createClient = (): any => createClientComponentClient<Database>()

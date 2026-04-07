'use client'

// Conditionally renders BottomNav — hidden on auth/special pages
import { usePathname } from 'next/navigation'
import BottomNav from './BottomNav'

const HIDE_ON = ['/login', '/signup', '/level-test', '/offline']

export default function NavWrapper() {
  const pathname = usePathname()
  if (HIDE_ON.some(p => pathname.startsWith(p))) return null
  return <BottomNav />
}

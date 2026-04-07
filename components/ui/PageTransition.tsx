'use client'

// Re-triggers fade-in on every route change via key={pathname}
import { usePathname } from 'next/navigation'

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div key={pathname} className="fade-in">
      {children}
    </div>
  )
}

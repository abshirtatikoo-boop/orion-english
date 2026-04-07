import type { Metadata, Viewport } from 'next'
import './globals.css'
import LastSeenUpdater from '@/components/ui/LastSeenUpdater'
import NavWrapper from '@/components/ui/NavWrapper'
import PageTransition from '@/components/ui/PageTransition'

export const metadata: Metadata = {
  title: 'Orion English — Ubaro English si Fudud',
  description: 'Ubaro English si Fudud',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#8B5CF6',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Orion English" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                })
              }
            `,
          }}
        />
      </head>
      <body>
        <div className="app-shell">
          <LastSeenUpdater />
          <PageTransition>
            {children}
          </PageTransition>
          <NavWrapper />
        </div>
      </body>
    </html>
  )
}

import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TMV Operating System',
  description: 'The Military Veteran — Internal Operating Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;700&family=Poppins:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body bg-cream antialiased">
        {children}
      </body>
    </html>
  )
}

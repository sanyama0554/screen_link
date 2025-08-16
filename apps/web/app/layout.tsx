import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Screen Link - Dependency Visualization',
  description: 'Visualize dependencies in your monorepo',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
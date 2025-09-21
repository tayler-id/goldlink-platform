import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { Inter, Orbitron } from "next/font/google"
import { Suspense } from "react"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron" })

export const metadata: Metadata = {
  title: "Goldlink - Premium Therapy Experience",
  description: "Professional therapy video chat platform with interactive tools, secure messaging, and premium user experience",
  generator: "Next.js",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${orbitron.variable}`}>
      <body className={inter.className}>
        <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
        <Analytics />
      </body>
    </html>
  )
}

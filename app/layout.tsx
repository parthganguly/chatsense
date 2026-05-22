import type React from "react"
import type { Metadata } from "next"
import { Mona_Sans as FontSans } from "next/font/google"
import { EB_Garamond } from "next/font/google"
import "./globals.css"

import { cn } from "@/lib/utils"

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontGaramond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-garamond",
})

export const metadata: Metadata = {
  title: "ChatSense",
  description: "Decode your WhatsApp chats. Understand moods. Enhance connections.",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={cn("h-dvh overflow-hidden bg-background font-sans antialiased", fontSans.variable, fontGaramond.variable)}
      >
        <div className="flex justify-center items-stretch md:items-center h-dvh bg-white md:bg-gray-200 md:p-4">
          <div className="w-full h-dvh md:max-w-sm md:h-[800px] bg-gradient-to-br from-white to-blue-50 md:rounded-3xl md:shadow-2xl overflow-hidden flex flex-col">
            {children}
          </div>
        </div>
      </body>
    </html>
  )
}

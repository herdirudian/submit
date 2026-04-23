import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { Toaster } from 'sonner';
import AuthProvider from '@/components/AuthProvider';

// Configure Local Fonts
const fontJudul = localFont({
  src: '../Fonts/Judul.otf',
  variable: '--font-judul',
  display: 'swap',
})

const fontSubJudul = localFont({
  src: '../Fonts/Sub Judul.otf',
  variable: '--font-sub-judul',
  display: 'swap',
})

const fontDeskripsi = localFont({
  src: '../Fonts/Deskripsi.otf',
  variable: '--font-deskripsi',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Form Builder - The Lodge Maribaya',
  description: 'Custom Form Builder for The Lodge Maribaya',
  icons: {
    icon: '/logotlm.png',
    apple: '/logotlm.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${fontJudul.variable} ${fontSubJudul.variable} ${fontDeskripsi.variable} font-deskripsi antialiased`}>
        <AuthProvider>
            {children}
            <Toaster position="top-center" />
        </AuthProvider>
      </body>
    </html>
  )
}

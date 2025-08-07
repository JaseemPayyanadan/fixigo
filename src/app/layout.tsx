import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: "Fixigo - Service Management",
    template: "%s | Fixigo"
  },
  description: "Professional service management platform",
  keywords: ["service management", "technicians", "branches", "invoices"],
  authors: [{ name: "Fixigo Team" }],
  creator: "Fixigo",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://fixigo.com",
    title: "Fixigo - Service Management",
    description: "Professional service management platform",
    siteName: "Fixigo",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fixigo - Service Management",
    description: "Professional service management platform",
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  // themeColor: "#2563eb",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Fixigo",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Android-specific viewport handling */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Handle Android navigation bar
              if (navigator.userAgent.includes('Android')) {
                const viewport = document.querySelector('meta[name="viewport"]');
                if (viewport) {
                  viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
                }
                
                // Add CSS for Android safe areas
                const style = document.createElement('style');
                style.textContent = \`
                  @supports (padding: max(0px)) {
                    .bottom-nav-fixed {
                      padding-bottom: max(1rem, env(safe-area-inset-bottom));
                    }
                    .main-content {
                      padding-bottom: calc(4rem + env(safe-area-inset-bottom));
                    }
                  }
                \`;
                document.head.appendChild(style);
              }
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} antialiased bg-gray-50`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

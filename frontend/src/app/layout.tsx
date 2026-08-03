import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { gremlinTrial } from "@/fonts/gremlin";
import Footer from "@/components/sections/Footer";
import PageViewTracker from "@/components/analytics/PageViewTracker";
import "./globals.css";

const isProduction = process.env.VERCEL_ENV === "production";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://likelion-khu.com"),
  title: {
    default: "멋쟁이사자처럼 경희대학교",
    template: "%s | 멋쟁이사자처럼 경희대학교",
  },
  description:
    "멋쟁이사자처럼 경희대학교 공식 웹사이트. 코딩을 배우고 함께 성장하며, 아이디어를 실제 서비스로 만드는 프로젝트와 활동을 소개합니다.",
  applicationName: "LIKELION KHU",
  keywords: [
    "멋쟁이사자처럼",
    "멋쟁이사자처럼 경희대",
    "LIKELION KHU",
    "경희대학교",
    "개발 동아리",
    "대학생 IT 동아리",
  ],
  authors: [{ name: "LIKELION KHU" }],
  creator: "LIKELION KHU",
  publisher: "LIKELION KHU",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "/",
    siteName: "LIKELION KHU",
    title: "LIKELION KHU | 멋쟁이사자처럼 경희대학교",
    description:
      "코딩을 배우고 함께 성장하며, 아이디어를 실제 서비스로 만드는 멋쟁이사자처럼 경희대학교의 프로젝트와 활동을 만나보세요.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "멋쟁이사자처럼 경희대학교",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LIKELION KHU | 멋쟁이사자처럼 경희대학교",
    description:
      "코딩을 배우고 함께 성장하며, 아이디어를 실제 서비스로 만드는 멋쟁이사자처럼 경희대학교 공식 웹사이트.",
    images: ["/og-image.png"],
  },
  robots: isProduction
    ? {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-image-preview": "large",
          "max-snippet": -1,
          "max-video-preview": -1,
        },
      }
    : {
        index: false,
        follow: false,
      },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistMono.variable} ${inter.variable} ${gremlinTrial.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.css"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <PageViewTracker />
        {children}
        <Footer />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Noto_Sans_JP, Noto_Sans_KR } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const notoKr = Noto_Sans_KR({
  variable: "--font-noto-kr",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const notoJp = Noto_Sans_JP({
  variable: "--font-noto-jp",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const title = "Kotoba Loop | JLPT 단어 반복 학습";
const description =
  "N5부터 N2까지, 보고 고르고 전부 맞힐 때까지 반복하는 빠른 일본어 단어 학습 도구";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const imageUrl = `${protocol}://${host}/og.png`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: imageUrl, width: 1732, height: 909, alt: "Kotoba Loop 빠른 반복 학습" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${notoKr.variable} ${notoJp.variable}`}>
        {children}
      </body>
    </html>
  );
}

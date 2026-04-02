import type { Metadata } from "next";
import Script from "next/script";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Robbit Akademiyasi | Robototexnika va Dasturlash (6-15 yosh)",
  description:
    "6-15 yosh bolalar uchun robototexnika va dasturlash kurslari. Bepul sinov darsiga yoziling, eng yaqin filial va narxni bilib oling.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pixelId = process.env.META_PIXEL_ID?.trim() || "";

  return (
    <html lang="uz" suppressHydrationWarning>
      <body className={plusJakartaSans.className} suppressHydrationWarning>
        {pixelId ? (
          <>
            <Script
              id="meta-pixel"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  !function(f,b,e,v,n,t,s)
                  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                  n.queue=[];t=b.createElement(e);t.async=!0;
                  t.src=v;s=b.getElementsByTagName(e)[0];
                  s.parentNode.insertBefore(t,s)}(window, document,'script',
                  'https://connect.facebook.net/en_US/fbevents.js');
                  fbq('init', '${pixelId}');
                  fbq('track', 'PageView');

                  window.__trackMetaLead = function(eventId) {
                    try {
                      if (typeof window.fbq === 'function' && eventId) {
                        window.fbq('track', 'Lead', {}, { eventID: eventId });
                      }
                    } catch (_) {}
                  };
                `,
              }}
            />
            <noscript>
              <img
                alt=""
                height="1"
                width="1"
                style={{ display: "none" }}
                src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
              />
            </noscript>
          </>
        ) : null}
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import HeaderAsync from "@/components/HeaderAsync";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HireAI · Kargo",
  description: "Internal hiring dashboard for Kargo",
};

export const dynamic = "force-dynamic";

const ZERO_COUNTS = { NEW: 0, APPROVED: 0, REJECTED: 0, HOLD: 0, HIRED: 0 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  const missingEnvVars = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "GEMINI_API_KEY",
    "RESEND_API_KEY",
    "RESEND_FROM_EMAIL",
    "SCHEDULING_LINK",
  ].filter((key) => !process.env[key]);

  const configured =
    !missingEnvVars.includes("SUPABASE_URL") && !missingEnvVars.includes("SUPABASE_SERVICE_ROLE_KEY");

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-100">
        {!configured ? (
          <SetupNotice missingEnvVars={missingEnvVars} />
        ) : (
          <>
            {/* Suspense lets the page below start fetching its own data
                immediately instead of waiting on this counts query first —
                the fallback reuses Header with zeroed counts, swapped for
                the real counts moments later. */}
            <Suspense fallback={<Header counts={ZERO_COUNTS} />}>
              <HeaderAsync />
            </Suspense>
            <main className="flex-1 mx-auto w-full max-w-7xl px-6 py-6">{children}</main>
          </>
        )}
      </body>
    </html>
  );
}

function SetupNotice({ missingEnvVars }: { missingEnvVars: string[] }) {
  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-lg border border-amber-800/50 bg-amber-950/40 p-6 space-y-3">
        <h1 className="font-semibold text-amber-300">HireAI isn&apos;t configured yet</h1>
        <p className="text-sm text-amber-200/80">
          Fill in the missing environment variables in <code>.env.local</code> and restart the
          dev server:
        </p>
        <ul className="text-sm font-mono text-amber-200 space-y-0.5">
          {missingEnvVars.map((key) => (
            <li key={key}>{key}</li>
          ))}
        </ul>
      </div>
    </main>
  );
}

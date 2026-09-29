import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { getStatusCounts } from "@/lib/queries";

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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const missingEnvVars = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "GEMINI_API_KEY",
    "RESEND_API_KEY",
    "RESEND_FROM_EMAIL",
    "SCHEDULING_LINK",
  ].filter((key) => !process.env[key]);

  const counts = missingEnvVars.includes("SUPABASE_URL") || missingEnvVars.includes("SUPABASE_SERVICE_ROLE_KEY")
    ? null
    : await getStatusCounts();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900">
        {counts === null ? (
          <SetupNotice missingEnvVars={missingEnvVars} />
        ) : (
          <>
            <Header counts={counts} />
            <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
          </>
        )}
      </body>
    </html>
  );
}

function SetupNotice({ missingEnvVars }: { missingEnvVars: string[] }) {
  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-lg border border-amber-200 bg-amber-50 p-6 space-y-3">
        <h1 className="font-semibold text-amber-900">HireAI isn&apos;t configured yet</h1>
        <p className="text-sm text-amber-800">
          Fill in the missing environment variables in <code>.env.local</code> and restart the
          dev server:
        </p>
        <ul className="text-sm font-mono text-amber-900 space-y-0.5">
          {missingEnvVars.map((key) => (
            <li key={key}>{key}</li>
          ))}
        </ul>
      </div>
    </main>
  );
}

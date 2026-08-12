import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Private journal access", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const requested = (await searchParams).next || "/journal";
  const nextPath = requested.startsWith("/") && !requested.startsWith("//") && !requested.includes("\\") ? requested : "/journal";
  return <main className="login-page" lang="en"><LoginForm nextPath={nextPath} /></main>;
}

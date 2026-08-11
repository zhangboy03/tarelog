import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requestHasAccess } from "@/lib/access";
import KitchenApp from "../KitchenApp";

export const metadata: Metadata = {
  title: "Private journal",
  description: "Tarelog 私人饮食记录、文字补记、食材识别与长期营养趋势。",
};

export default async function JournalPage() {
  const requestHeaders = await headers();
  const request = new Request("https://tarelog.local/journal", { headers: requestHeaders });
  if (!await requestHasAccess(request)) redirect("/login?next=%2Fjournal");
  return <div lang="zh-CN"><KitchenApp /></div>;
}

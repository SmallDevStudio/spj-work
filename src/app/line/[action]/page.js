import { notFound, redirect } from "next/navigation";
import { LINE_RICH_MENU_ACTIONS } from "@/constants/line-rich-menu";
import { requireCurrentSession } from "@/lib/auth/authorization";
import { resolveLineRichMenuDestination } from "@/services/line/line-rich-menu.service";

export const dynamic = "force-dynamic";

export default async function LineRichMenuEntry({ params }) {
  const { action } = await params;
  if (!Object.hasOwn(LINE_RICH_MENU_ACTIONS, action)) notFound();
  const session = await requireCurrentSession().catch(() => null);
  if (!session) redirect(`/login?returnTo=${encodeURIComponent(`/line/${action}`)}`);
  const destination = await resolveLineRichMenuDestination({ session, action });
  if (!destination) notFound();
  redirect(destination);
}

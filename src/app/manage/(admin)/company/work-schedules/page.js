import { redirect } from "next/navigation";

export default function LegacyWorkSchedulesPage() {
  redirect("/manage/company#work-schedules");
}

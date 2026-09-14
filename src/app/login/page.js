import { redirect } from "next/navigation";

import LoginForm from "@/components/auth/LoginForm";
import { getCurrentApplicationSession } from "@/lib/auth/current-session";

export const metadata = {
  title: "เข้าสู่ระบบ",
};

export default async function LoginPage() {
  const currentSession = await getCurrentApplicationSession().catch(() => null);

  if (currentSession) {
    redirect("/dashboard");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-100 dark:bg-slate-950">
      <div className="absolute inset-0">
        <div className="absolute -top-32 -left-32 size-96 rounded-full bg-amber-300/30 blur-3xl dark:bg-amber-500/10" />
        <div className="absolute -right-40 -bottom-40 size-[30rem] rounded-full bg-blue-800/20 blur-3xl dark:bg-blue-700/10" />
      </div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl items-center gap-12 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_28rem] lg:px-12">
        <section className="hidden max-w-2xl lg:block">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-600 dark:text-amber-400">
            Superjeew Co., Ltd.
          </p>

          <h2 className="mt-5 text-5xl font-bold leading-tight tracking-tight text-slate-950 dark:text-white xl:text-6xl">
            People, production
            <br />
            and projects
            <br />
            in one place.
          </h2>

          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600 dark:text-slate-300">
            ระบบบริหารงานบุคคลที่ออกแบบให้เข้ากับการทำงานของทีมผลิตรายการโทรทัศน์และคอนเทนต์
          </p>
        </section>

        <div className="flex justify-center lg:justify-end">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}

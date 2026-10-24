export default function ManagePageHero({ eyebrow, title, description, action }) {
  return (
    <section className="flex flex-col gap-5 rounded-[2rem] bg-slate-950 px-6 py-7 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-400">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
          {description}
        </p>
      </div>
      {action}
    </section>
  );
}

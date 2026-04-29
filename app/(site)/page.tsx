import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <section className="mb-16 rounded-lg border border-zinc-200 bg-zinc-50 p-12 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
          New arrivals · Restocks · Pre-orders
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
          Records, carefully selected.
        </h1>
        <p className="mt-3 max-w-prose text-zinc-600 dark:text-zinc-400">
          Independent record shop in Jakarta. New & used vinyl, CDs, cassettes, books.
          We ship across Indonesia and worldwide.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/shop"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Browse shop
          </Link>
          <Link
            href="/news"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Read news
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-zinc-500">
          Featured releases
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
            />
          ))}
        </div>
      </section>
    </div>
  );
}

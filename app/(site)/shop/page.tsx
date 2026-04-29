export default function ShopPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Shop</h1>
      <p className="mt-2 text-zinc-500">Filter by format, genre, condition, price, label.</p>
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
          />
        ))}
      </div>
    </div>
  );
}

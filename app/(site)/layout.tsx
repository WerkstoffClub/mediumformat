import Link from "next/link";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="font-mono text-lg font-semibold tracking-tight">
            MEDIUM·FORMAT
          </Link>
          <nav className="flex gap-6 text-sm">
            <Link href="/shop">Shop</Link>
            <Link href="/news">News</Link>
            <Link href="/about">About</Link>
            <Link href="/account" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
              Account
            </Link>
            <Link href="/cart" className="font-medium">
              Cart (0)
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mt-16 border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm text-zinc-500 sm:flex-row sm:justify-between">
          <span>© Medium Format · Jakarta, Indonesia</span>
          <div className="flex gap-4">
            <Link href="/shipping">Shipping</Link>
            <Link href="/returns">Returns</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

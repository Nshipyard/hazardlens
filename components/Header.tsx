import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#ececec] bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 grid-cols-2 gap-[3px]" aria-hidden="true">
            <span className="rounded-[3px] bg-[#2563eb]" />
            <span className="rounded-[3px] bg-[#93c5fd]" />
            <span className="rounded-[3px] bg-[#93c5fd]" />
            <span className="rounded-[3px] bg-[#2563eb]" />
          </span>
          <span className="text-lg font-semibold tracking-tight">hazardlens</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium text-neutral-600">
          <Link href="#map" className="hidden rounded-lg px-3 py-2 transition-colors hover:bg-neutral-100 hover:text-neutral-900 sm:block">
            Map
          </Link>
          <Link href="#feed" className="hidden rounded-lg px-3 py-2 transition-colors hover:bg-neutral-100 hover:text-neutral-900 sm:block">
            Feed
          </Link>
          <Link href="#method" className="hidden rounded-lg px-3 py-2 transition-colors hover:bg-neutral-100 hover:text-neutral-900 sm:block">
            Method
          </Link>
          <Link href="#api" className="rounded-lg bg-[#2563eb] px-4 py-2 text-white transition-colors hover:bg-[#1d4ed8]">
            API
          </Link>
        </nav>
      </div>
    </header>
  );
}

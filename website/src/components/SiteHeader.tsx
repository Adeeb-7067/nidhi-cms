import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { site } from "@/data/mock";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 md:px-8">
        <Link href="/" className="flex items-center gap-3 group">
          <Logo size="sm" className="transition-transform group-hover:scale-105" />
          <span className="hidden sm:flex flex-col">
            <span className="font-display text-[15px] text-foreground leading-none">{site.brandShort}</span>
            <span className="text-meta mt-1">Technologies</span>
          </span>
        </Link>

        <nav className="flex items-center gap-5 md:gap-7">
          <Link
            href="/services"
            className="text-label text-secondary-foreground hover:text-foreground"
          >
            Services
          </Link>
          <Link
            href="/work"
            className="text-label text-secondary-foreground hover:text-foreground"
          >
            Work
          </Link>
          <Link
            href="/industries"
            className="hidden sm:inline text-label text-secondary-foreground hover:text-foreground"
          >
            Industries
          </Link>
          <Link
            href="/#contact"
            className="rounded-full bg-[linear-gradient(115deg,#2B6BFF,#00D9FF)] px-4 py-2 text-meta text-foreground"
          >
            Contact
          </Link>
        </nav>
      </div>
    </header>
  );
}

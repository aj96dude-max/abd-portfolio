"use client";

import { useEffect, useState } from "react";
import { NAV_LINKS, SITE_META } from "@/data/portfolio";

interface NavBarProps {
  activeHref: string;
}

export function NavBar({ activeHref }: NavBarProps) {
  const [hidden, setHidden] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const currentY = window.scrollY;
        if (currentY > 90) {
          if (currentY - lastY > 6) setHidden(true);
          else if (lastY - currentY > 6) setHidden(false);
        } else {
          setHidden(false);
        }
        lastY = currentY;
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      id="site-nav"
      className={`fixed inset-x-0 top-3 z-30 flex justify-center px-3 transition-all duration-300 ${
        hidden && !mobileOpen
          ? "-translate-y-20 opacity-0 pointer-events-none"
          : "translate-y-0 opacity-100"
      }`}
    >
      <a
        href="#about"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-xs focus:font-semibold focus:text-black"
      >
        Skip to Main Content
      </a>

      <nav
        aria-label="Primary Navigation"
        className="w-full max-w-2xl rounded-2xl border border-white/12 bg-black/75 px-3 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.65)] backdrop-blur-xl md:w-auto md:rounded-full md:px-2.5 md:py-1.5"
      >
        <div className="flex flex-col md:flex-row md:items-center md:gap-1">
          <div className="flex items-center justify-between">
            <a
              href="#hero"
              onClick={() => setMobileOpen(false)}
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold tracking-tight text-white/95 transition-colors hover:bg-white/8"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
              <span>{SITE_META.displayName}</span>
            </a>

            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label="Toggle Menu"
              aria-expanded={mobileOpen}
              className="rounded-full p-2 text-white/80 hover:bg-white/10 md:hidden"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                {mobileOpen ? (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </>
                ) : (
                  <>
                    <line x1="3" y1="7" x2="21" y2="7" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="17" x2="21" y2="17" />
                  </>
                )}
              </svg>
            </button>
          </div>

          <div
            className={`${
              mobileOpen ? "mt-2 flex border-t border-white/10 pt-2" : "hidden"
            } flex-col gap-1 md:mt-0 md:flex md:flex-row md:items-center md:border-none md:pt-0`}
          >
            <div className="mx-1 hidden h-4 w-px bg-white/12 md:block" />

            {NAV_LINKS.map((link) => {
              const isActive = activeHref === link.href;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-full px-3 py-1.5 text-center text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-white/14 text-white"
                      : "text-white/60 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  {link.name}
                </a>
              );
            })}

            <div className="mx-1 hidden h-4 w-px bg-white/12 md:block" />

            <a
              href={SITE_META.github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              title="GitHub"
              className="hidden items-center justify-center rounded-full p-2 text-white/65 transition-colors hover:bg-white/8 hover:text-white md:inline-flex"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>
      </nav>
    </header>
  );
}


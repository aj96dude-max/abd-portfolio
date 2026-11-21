"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ABOUT_PARAGRAPHS,
  CREATIVE_PURSUITS,
  CURRENTLY_BUILDING,
  HIGHLIGHTS,
  SITE_META,
  SKILL_GROUPS,
} from "@/data/portfolio";
import { CAMERA_CUES } from "@/engine/cues";
import type { StudioEngine } from "@/engine/StudioEngine";
import type { EngineFrameSnapshot } from "@/engine/types";
import type { ProjectItem } from "@/lib/projects";
import { ContactForm, type EmailJsConfig } from "./ContactForm";
import { ExplodedCallouts } from "./ExplodedCallouts";
import { NavBar } from "./NavBar";
import { PowerUpControl } from "./PowerUpControl";
import { ProjectList } from "./ProjectList";
import { StudioCanvas } from "./StudioCanvas";

interface PortfolioShellProps {
  projects: ProjectItem[];
  emailConfig: EmailJsConfig;
}

function SectionHeading({ number, title }: { number: string; title: string }) {
  return (
    <div className="mb-8 flex items-baseline gap-3 border-b border-white/10 pb-4">
      <span className="font-mono-tech text-xs font-medium tracking-[0.08em] text-white/40">
        {number}
      </span>
      <h2 className="text-2xl font-semibold tracking-tight text-white/95 lowercase md:text-3xl">
        {title}
      </h2>
    </div>
  );
}

const CUE_LABELS = new Map(CAMERA_CUES.map((c) => [c.id, c.label]));

export function PortfolioShell({ projects, emailConfig }: PortfolioShellProps) {
  const engineRef = useRef<StudioEngine | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const calloutUpdaterRef = useRef<((s: EngineFrameSnapshot) => void) | null>(null);
  const powerUpdaterRef = useRef<((s: EngineFrameSnapshot) => void) | null>(null);
  const cueLabelRef = useRef<HTMLSpanElement | null>(null);
  const fitMmRef = useRef<HTMLSpanElement | null>(null);
  const slowBadgeRef = useRef<HTMLSpanElement | null>(null);

  const [sceneReady, setSceneReady] = useState(false);
  const [blueprint, setBlueprint] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [muted, setMuted] = useState(false);
  const [activeHref, setActiveHref] = useState("#about");
  const [showBackToTop, setShowBackToTop] = useState(false);

  const handleReady = useCallback(() => {
    setSceneReady(true);
    engineRef.current?.refreshCueElements();
  }, []);

  const handleFrameUpdate = useCallback((snapshot: EngineFrameSnapshot) => {
    calloutUpdaterRef.current?.(snapshot);
    powerUpdaterRef.current?.(snapshot);

    if (cueLabelRef.current) {
      cueLabelRef.current.textContent =
        CUE_LABELS.get(snapshot.activeCue) ?? "00 · MODULE OVERVIEW";
    }
    if (fitMmRef.current) {
      fitMmRef.current.textContent = `${snapshot.fitMm} MM FRAME`;
    }
    if (slowBadgeRef.current) {
      const isSlow = snapshot.timeScale < 0.25;
      slowBadgeRef.current.style.opacity = isSlow ? "1" : "0.35";
      slowBadgeRef.current.textContent = isSlow ? "1/12× MACRO" : `${snapshot.timeScale.toFixed(1)}× CLK`;
    }
  }, []);

  // Scroll-driven text reveals, reading progress, and nav tracking (zero IntersectionObserver).
  useEffect(() => {
    const revealEls = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    const trackedSections = Array.from(
      document.querySelectorAll<HTMLElement>("section[data-nav-target]"),
    );

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reducedMotion) {
      revealEls.forEach((el) => el.setAttribute("data-reveal", "visible"));
    }

    let rafPending = false;
    let lastActive = "";

    const updateFromScroll = () => {
      rafPending = false;
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const vh = window.innerHeight || 800;
      const maxScroll = Math.max(
        1,
        document.documentElement.scrollHeight - vh,
      );
      const pct = Math.max(0, Math.min(100, (scrollY / maxScroll) * 100));

      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${pct.toFixed(2)}%`;
      }

      setShowBackToTop((prev) => {
        const next = scrollY > 360;
        return prev === next ? prev : next;
      });

      if (!reducedMotion) {
        const triggerY = vh * 0.9;
        for (const el of revealEls) {
          if (el.getAttribute("data-reveal") === "visible") continue;
          const rect = el.getBoundingClientRect();
          if (rect.top <= triggerY) {
            el.setAttribute("data-reveal", "visible");
          }
        }
      }

      const probeY = vh * 0.42;
      let currentTarget = "#about";
      for (const sec of trackedSections) {
        const rect = sec.getBoundingClientRect();
        if (rect.top <= probeY) {
          currentTarget = `#${sec.id}`;
        }
      }
      if (currentTarget !== lastActive) {
        lastActive = currentTarget;
        setActiveHref(currentTarget);
      }
    };

    const onScroll = () => {
      if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(updateFromScroll);
      }
    };

    updateFromScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Console easter egg preserved from original portfolio.
  useEffect(() => {
    console.log(
      "%c> abdullah.init()",
      "color: #fff; font-family: monospace; font-size: 14px; font-weight: bold;",
    );
    console.log(
      "%cAI Student. Building intelligent systems and training models.",
      "color: #888; font-family: monospace; font-size: 11px;",
    );
    console.log(
      "%c\nStack: Python, SQL, Machine Learning, Deep Learning, CV.\n\nLooking at the source? Good instinct.\nhttps://github.com/aj96dude-max/",
      "color: #666; font-family: monospace; font-size: 11px;",
    );
  }, []);

  return (
    <main className="relative overflow-x-clip bg-[#050507] text-[#f4f4f6]">
      {/* Reading progress hairline */}
      <div
        ref={progressBarRef}
        className="fixed top-0 left-0 z-50 h-px w-0 bg-white/85 transition-[width] duration-75"
        aria-hidden="true"
      />

      <NavBar activeHref={activeHref} />

      {/* Background fixed procedural 3D studio canvas */}
      <StudioCanvas
        engineRef={engineRef}
        ready={sceneReady}
        onReady={handleReady}
        onFrameUpdate={handleFrameUpdate}
      />

      {/* Persistent minimal studio HUD */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-full border border-white/12 bg-black/70 px-3 py-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.75)] backdrop-blur-xl">
          <div className="hidden items-center gap-2.5 pl-1 pr-2 font-mono-tech text-[10px] tracking-[0.12em] text-white/55 lg:flex">
            <span ref={cueLabelRef}>00 · MODULE OVERVIEW</span>
            <span className="text-white/20">|</span>
            <span ref={fitMmRef}>56 MM FRAME</span>
            <span className="text-white/20">|</span>
            <span ref={slowBadgeRef}>1.0× CLK</span>
          </div>

          <PowerUpControl
            onHoldStart={() => {
              setAudioUnlocked(true);
              engineRef.current?.setHoldingPower(true);
            }}
            onHoldEnd={() => engineRef.current?.setHoldingPower(false)}
            updaterRef={powerUpdaterRef}
          />

          <button
            type="button"
            onClick={() => {
              const next = engineRef.current?.toggleBlueprint();
              if (typeof next === "boolean") setBlueprint(next);
              setAudioUnlocked(true);
            }}
            aria-pressed={blueprint}
            className={`rounded-full border px-3.5 py-2 font-mono-tech text-[11px] font-medium uppercase tracking-[0.1em] transition-colors cursor-pointer ${
              blueprint
                ? "border-sky-300/60 bg-sky-300/15 text-sky-100"
                : "border-white/15 bg-black/60 text-white/75 hover:border-white/40 hover:text-white"
            }`}
          >
            Blueprint
          </button>

          {audioUnlocked && (
            <button
              type="button"
              onClick={() => {
                const nextMuted = engineRef.current?.toggleMute();
                if (typeof nextMuted === "boolean") setMuted(nextMuted);
              }}
              aria-label={muted ? "Unmute tactile audio" : "Mute tactile audio"}
              className="rounded-full border border-white/15 bg-black/60 px-3 py-2 font-mono-tech text-[10px] uppercase tracking-[0.1em] text-white/70 transition-colors hover:border-white/40 hover:text-white cursor-pointer"
            >
              {muted ? "SFX OFF" : "SFX ON"}
            </button>
          )}
        </div>
      </div>

      {/* Back to Top button */}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Back to top"
        className={`fixed right-5 bottom-20 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/75 text-sm text-white backdrop-blur-md transition-all duration-200 hover:border-white hover:bg-white hover:text-black cursor-pointer md:bottom-5 ${
          showBackToTop
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0"
        }`}
      >
        &uarr;
      </button>

      {/* Foreground Portfolio Narrative Content */}
      <div className="relative z-10">
        {/* BEAT 1: HERO */}
        <section
          id="hero"
          data-cue="hero"
          className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 pt-24 pb-28 md:px-10"
        >
          <div className="max-w-xl">
            <div className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-white/12 bg-black/50 px-3.5 py-1 backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-300" />
              <span className="font-mono-tech text-[11px] font-medium uppercase tracking-[0.16em] text-white/70">
                {SITE_META.roleLabel}
              </span>
            </div>

            <h1 className="text-[clamp(3.25rem,9vw,6.75rem)] font-bold leading-[0.94] tracking-[-0.04em] text-white lowercase">
              <span className="block">abdullah</span>
              <span className="block text-white/90">javed</span>
            </h1>

            <p className="mt-7 max-w-md text-base leading-relaxed text-white/70 md:text-lg">
              {SITE_META.tagline}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={`mailto:${SITE_META.email}`}
                className="rounded-full border border-white/20 bg-black/55 px-4 py-2 font-mono-tech text-xs font-medium text-white/85 backdrop-blur-md transition-colors hover:border-white hover:bg-white hover:text-black"
              >
                mail
              </a>
              <a
                href={SITE_META.github}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/20 bg-black/55 px-4 py-2 font-mono-tech text-xs font-medium text-white/85 backdrop-blur-md transition-colors hover:border-white hover:bg-white hover:text-black"
              >
                github
              </a>
              <a
                href={SITE_META.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/20 bg-black/55 px-4 py-2 font-mono-tech text-xs font-medium text-white/85 backdrop-blur-md transition-colors hover:border-white hover:bg-white hover:text-black"
              >
                resume
              </a>
            </div>

            <p className="mt-12 font-mono-tech text-[11px] uppercase tracking-[0.16em] text-white/40">
              Scroll to inspect internal neural compute architecture &darr;
            </p>
          </div>
        </section>

        {/* BEAT 2: CLOSE-UP (About + Core Stack, 1/12 slow motion macro) */}
        <div
          data-cue="close"
          className="mx-auto max-w-6xl px-6 py-24 md:px-10 md:py-32"
        >
          <section
            id="about"
            data-nav-target
            className="max-w-xl rounded-2xl border border-white/10 bg-black/62 p-7 backdrop-blur-xl md:p-9"
          >
            <SectionHeading number="01" title="about" />
            <div className="space-y-4 text-sm leading-relaxed text-white/70 md:text-[15px]">
              {ABOUT_PARAGRAPHS.map((paragraph, idx) => (
                <p key={idx} data-reveal style={{ transitionDelay: `${idx * 70}ms` }}>
                  {paragraph}
                </p>
              ))}
            </div>
          </section>

          <section
            id="skills"
            data-nav-target
            className="mt-16 max-w-2xl rounded-2xl border border-white/10 bg-black/62 p-7 backdrop-blur-xl md:mt-24 md:p-9"
          >
            <SectionHeading number="02" title="stack" />
            <div className="grid grid-cols-1 gap-7 sm:grid-cols-2">
              {SKILL_GROUPS.map((group, gi) => (
                <div
                  key={group.label}
                  data-reveal
                  style={{ transitionDelay: `${gi * 70}ms` }}
                >
                  <div className="mb-3 font-mono-tech text-[11px] font-medium uppercase tracking-[0.12em] text-white/45">
                    {group.label}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.items.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-white/12 px-3 py-1 text-xs font-medium text-white/75 transition-colors hover:border-white/50 hover:text-white"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* BEAT 3: APART (Exploded Sticky Callouts + Featured & All Projects) */}
        <section id="projects" data-nav-target className="relative">
          {/* Sticky inspection viewport */}
          <div data-cue="apart" className="h-[135vh]">
            <div className="sticky top-0 h-screen w-full">
              <ExplodedCallouts updaterRef={calloutUpdaterRef} />
            </div>
          </div>

          {/* Projects Catalog */}
          <div className="mx-auto max-w-5xl px-6 py-20 md:px-10">
            <SectionHeading number="03" title="featured work" />
            <ProjectList projects={projects} />
          </div>
        </section>

        {/* BEAT 4: AROUND (Highlights + Currently Building + Creative Pursuits) */}
        <div data-cue="around" className="mx-auto max-w-5xl px-6 py-20 md:px-10">
          <section id="highlights" data-nav-target className="py-10">
            <SectionHeading number="04" title="highlights" />
            <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-white/12 bg-white/10 gap-px md:grid-cols-3">
              {HIGHLIGHTS.map((item, idx) => (
                <div
                  key={item.metric}
                  data-reveal
                  style={{ transitionDelay: `${idx * 60}ms` }}
                  className="flex flex-col gap-2 bg-[#07080b]/88 p-6 backdrop-blur-md"
                >
                  <span className="text-lg font-semibold tracking-tight text-white md:text-xl">
                    {item.metric}
                  </span>
                  <span className="text-xs leading-relaxed text-white/55">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section id="building" className="mt-14 py-10">
            <SectionHeading number="05" title="currently building" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {CURRENTLY_BUILDING.map((item, idx) => (
                <div
                  key={item.name}
                  data-reveal
                  style={{ transitionDelay: `${idx * 80}ms` }}
                  className="flex items-start gap-4 rounded-xl border border-white/12 bg-black/62 p-6 backdrop-blur-md transition-colors hover:border-white/35"
                >
                  <div className="pt-1.5">
                    <span className="status-dot-live block h-2 w-2 rounded-full bg-white" />
                  </div>
                  <div>
                    <div className="text-base font-semibold text-white">
                      {item.name}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-white/60">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="creative" className="mt-14 py-10">
            <SectionHeading number="06" title="creative pursuits" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {CREATIVE_PURSUITS.map((item, idx) => (
                <div
                  key={item.title}
                  data-reveal
                  style={{ transitionDelay: `${idx * 80}ms` }}
                  className="rounded-xl border border-white/12 bg-black/62 p-6 backdrop-blur-md transition-colors hover:border-white/35"
                >
                  <h3 className="text-base font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">
                    {item.prefix}
                    <strong className="font-medium text-white">
                      {item.highlight}
                    </strong>
                    {item.suffix}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* BEAT 5: REBUILD / OUTRO (Contact, Socials, Resume & Footer) */}
        <section
          id="contact"
          data-cue="rebuild"
          data-nav-target
          className="mx-auto max-w-5xl px-6 pt-20 pb-28 md:px-10"
        >
          <div className="rounded-2xl border border-white/12 bg-black/68 p-7 backdrop-blur-xl md:p-10">
            <SectionHeading number="07" title="contact" />
            <div data-reveal>
              <ContactForm config={emailConfig} />
            </div>
          </div>

          <footer className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs text-white/45">
            <span>&copy; 2026 {SITE_META.displayName}</span>
            <span className="font-mono-tech text-[11px] text-white/35">
              Procedural Three.js Studio &middot; Next.js App Router
            </span>
          </footer>
        </section>
      </div>
    </main>
  );
}

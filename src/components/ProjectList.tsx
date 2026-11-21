"use client";

import { useEffect, useState } from "react";
import type { ProjectItem } from "@/lib/projects";

interface ProjectListProps {
  projects: ProjectItem[];
}

const CACHE_TTL = 1000 * 60 * 15;
const STORAGE_KEY = "project-star-cache";

function parseRepo(githubUrl: string): { owner: string; repo: string } | null {
  try {
    const { pathname } = new URL(githubUrl);
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1] };
  } catch {
    return null;
  }
}

export function ProjectList({ projects }: ProjectListProps) {
  const [starCounts, setStarCounts] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const p of projects) {
      if (p.github && typeof p.stars === "number") {
        initial[p.github] = p.stars;
      }
    }
    return initial;
  });

  useEffect(() => {
    const withGithub = projects.filter((p) => Boolean(p.github));
    if (withGithub.length === 0) return;

    let cancelled = false;
    const hydrate = async () => {
      let cache: Record<string, { stars: number; ts: number }> = {};
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) cache = JSON.parse(raw);
      } catch {
        cache = {};
      }

      const now = Date.now();
      const updates: Record<string, number> = {};

      for (const project of withGithub) {
        const github = project.github!;
        const cached = cache[github];
        if (cached && now - cached.ts < CACHE_TTL) {
          updates[github] = cached.stars;
          continue;
        }

        const parsed = parseRepo(github);
        if (!parsed) continue;

        try {
          const res = await fetch(
            `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
          );
          if (!res.ok) continue;
          const data = (await res.json()) as { stargazers_count?: number };
          const stars = Number(data?.stargazers_count ?? 0);
          if (Number.isFinite(stars)) {
            updates[github] = stars;
            cache[github] = { stars, ts: now };
          }
        } catch {
          // Ignore offline/rate-limit fetch failures gracefully.
        }
      }

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
      } catch {
        // Ignore storage quota exceptions.
      }

      if (!cancelled && Object.keys(updates).length > 0) {
        setStarCounts((prev) => ({ ...prev, ...updates }));
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [projects]);

  const featured = projects.filter((p) => p.featured);
  const other = projects.filter((p) => !p.featured);

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {featured.map((project, idx) => (
          <article
            key={project.slug}
            data-reveal
            style={{ transitionDelay: `${idx * 80}ms` }}
            className="group relative flex flex-col justify-between rounded-xl border border-white/12 bg-black/65 p-7 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-white/35"
          >
            <div>
              <div className="mb-4 flex items-center justify-between">
                <span className="font-mono-tech text-[11px] font-medium uppercase tracking-[0.12em] text-white/80">
                  Featured
                </span>
                {project.github && (
                  <span className="inline-flex items-center gap-1 font-mono-tech text-xs text-white/50">
                    <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 .587l3.668 7.431L23.4 9.75l-5.7 5.556L19.335 24 12 19.897 4.665 24l1.634-8.694L.6 9.75l7.732-1.732z" />
                    </svg>
                    <span>{starCounts[project.github] ?? project.stars ?? 0}</span>
                  </span>
                )}
              </div>

              <h3 className="text-2xl font-semibold tracking-tight text-white/95">
                {project.title}
              </h3>

              <p className="mt-3 text-sm leading-relaxed text-white/65">
                {project.description}
              </p>
            </div>

            <div className="mt-6">
              <div className="flex flex-wrap gap-1.5">
                {project.tech.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-white/12 px-2.5 py-0.5 font-mono-tech text-[11px] lowercase text-white/55"
                  >
                    {t}
                  </span>
                ))}
              </div>

              {(project.github || project.live) && (
                <div className="mt-5 flex flex-wrap gap-3">
                  {project.github && (
                    <a
                      href={project.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:border-white hover:bg-white hover:text-black"
                    >
                      View source
                      <span aria-hidden="true">&nearr;</span>
                    </a>
                  )}
                  {project.live && (
                    <a
                      href={project.live}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:border-white hover:bg-white hover:text-black"
                    >
                      Live
                      <span aria-hidden="true">&nearr;</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>

      <h3 className="mt-12 mb-4 font-mono-tech text-xs font-medium uppercase tracking-[0.12em] text-white/45">
        All Projects
      </h3>

      <div className="divide-y divide-white/10 rounded-xl border border-white/12 bg-black/55 px-6 backdrop-blur-md">
        {other.map((project, idx) => (
          <article
            key={project.slug}
            data-reveal
            style={{ transitionDelay: `${idx * 60}ms` }}
            className="py-6 transition-transform duration-200 hover:translate-x-1"
          >
            <div className="font-mono-tech text-[11px] uppercase tracking-[0.08em] text-white/45">
              {project.tech.join(" / ")}
            </div>
            <h4 className="mt-1.5 text-xl font-semibold tracking-tight text-white/95">
              {project.title}
            </h4>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/65">
              {project.description}
            </p>

            {(project.github || project.live) && (
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                {project.github && (
                  <a
                    href={project.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 font-mono-tech text-[11px] text-white/75 transition-colors hover:border-white hover:bg-white hover:text-black"
                  >
                    source &nearr;
                  </a>
                )}
                {project.live && (
                  <a
                    href={project.live}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 font-mono-tech text-[11px] text-white/75 transition-colors hover:border-white hover:bg-white hover:text-black"
                  >
                    live &nearr;
                  </a>
                )}
                {project.github && (
                  <span className="inline-flex items-center gap-1 font-mono-tech text-[11px] text-white/45">
                    &#9733; {starCounts[project.github] ?? project.stars ?? 0}
                  </span>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}


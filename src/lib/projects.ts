import { promises as fs } from "fs";
import path from "path";
import { getGitHubStars } from "./github";

export interface ProjectItem {
  slug: string;
  title: string;
  description: string;
  tech: string[];
  github?: string;
  live?: string;
  stars?: number;
  featured: boolean;
  order: number;
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseArray(raw: string): string[] {
  const inner = raw.trim().replace(/^\[/, "").replace(/\]$/, "");
  if (!inner.trim()) return [];
  return inner
    .split(",")
    .map((item) => unquote(item))
    .filter(Boolean);
}

function parseFrontmatter(source: string): Record<string, string> {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};

  const record: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (key) {
      record[key] = val;
    }
  }
  return record;
}

export async function loadProjects(): Promise<ProjectItem[]> {
  const projectsDir = path.join(process.cwd(), "src", "content", "projects");
  const entries = await fs.readdir(projectsDir);
  const mdFiles = entries.filter((name) => name.endsWith(".md"));

  const items = await Promise.all(
    mdFiles.map(async (file): Promise<ProjectItem> => {
      const slug = file.replace(/\.md$/, "");
      const raw = await fs.readFile(path.join(projectsDir, file), "utf8");
      const fm = parseFrontmatter(raw);

      const github = fm.github ? unquote(fm.github) : undefined;
      const live = fm.live ? unquote(fm.live) : undefined;
      const stars = github ? await getGitHubStars(github) : undefined;

      return {
        slug,
        title: fm.title ? unquote(fm.title) : slug,
        description: fm.description ? unquote(fm.description) : "",
        tech: fm.tech ? parseArray(fm.tech) : [],
        github,
        live,
        stars,
        featured: fm.featured === "true",
        order: fm.order ? Number(fm.order) : 999,
      };
    }),
  );

  return items.sort((a, b) => a.order - b.order);
}


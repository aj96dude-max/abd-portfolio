interface GitHubRepoResponse {
  stargazers_count?: number;
}

export async function getGitHubStars(githubUrl: string): Promise<number> {
  try {
    const parsed = new URL(githubUrl);
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length < 2) {
      return 0;
    }

    const [owner, repo] = parts;
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
        },
        signal: AbortSignal.timeout(3000),
      },
    );

    if (!response.ok) {
      return 0;
    }

    const data = (await response.json()) as GitHubRepoResponse;
    return typeof data.stargazers_count === "number"
      ? data.stargazers_count
      : 0;
  } catch {
    return 0;
  }
}


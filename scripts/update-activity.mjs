import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const projects = [
  { repo: "ParkEase", label: "ParkEase" },
  { repo: "lab_asset_management2", label: "Lab Asset Management" },
  { repo: "pcap-crowd-crush-simulation", label: "Parallel Crowd-Crush Risk Simulation" },
];

const startMarker = "<!-- recent-repos:start -->";
const endMarker = "<!-- recent-repos:end -->";

export function renderRecent(projectsWithDates) {
  return [...projectsWithDates]
    .sort((a, b) => Date.parse(b.pushedAt) - Date.parse(a.pushedAt) || a.label.localeCompare(b.label))
    .map(({ repo, label, pushedAt }) => {
      const date = new Date(pushedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
      return `- [${label}](https://github.com/Dwijeshh/${repo}) — last pushed ${date}`;
    })
    .join("\n");
}

export function replaceRecent(readme, rendered) {
  const start = readme.indexOf(startMarker);
  const end = readme.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0 || readme.indexOf(startMarker, start + 1) >= 0) {
    throw new Error("README activity markers are missing or duplicated");
  }
  return readme.slice(0, start) + startMarker + "\n" + rendered + "\n" + readme.slice(end);
}

async function fetchProject(project) {
  const url = `https://api.github.com/repos/Dwijeshh/${project.repo}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "dwijeshh-profile-activity",
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    },
  });
  if (!response.ok) throw new Error(`GitHub API returned ${response.status} for ${project.repo}`);
  const data = await response.json();
  if (!data.pushed_at || Number.isNaN(Date.parse(data.pushed_at))) {
    throw new Error(`Missing pushed_at for ${project.repo}`);
  }
  return { ...project, pushedAt: data.pushed_at };
}

async function main() {
  const recent = await Promise.all(projects.map(fetchProject));
  const readme = await readFile("README.md", "utf8");
  const updated = replaceRecent(readme, renderRecent(recent));
  if (updated !== readme) await writeFile("README.md", updated, "utf8");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}

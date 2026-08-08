// One-time index builder: parses the upstream repo's README.md puzzle tables
// into data/puzzles.json. Run with: node scripts/build-index.js
const fs = require('fs');
const path = require('path');

const README_URL =
    'https://raw.githubusercontent.com/HCABurns/CodinGame-Solutions/main/README.md';
const REPO_NAME_FIX = /github\.com\/HCABurns\/(Coding-Game-Solutions|CodinGame-Solutions)/g;

async function main() {
    const res = await fetch(README_URL);
    if (!res.ok) throw new Error(`README fetch failed: ${res.status}`);
    const text = await res.text();
    const lines = text.split('\n');

    const startIdx = lines.findIndex((l) => l.trim() === '# Puzzles');
    const endIdx = lines.findIndex(
        (l, i) => i > startIdx && /^# /.test(l.trim())
    );
    const section = lines.slice(startIdx, endIdx === -1 ? lines.length : endIdx);

    const puzzles = [];
    let difficulty = null;

    for (const rawLine of section) {
        const line = rawLine.trim();

        const headingMatch = line.match(/^##\s+(Easy|Medium|Hard|Very Hard)\s*$/);
        if (headingMatch) {
            difficulty = headingMatch[1];
            continue;
        }

        if (!line.startsWith('|') || !difficulty) continue;
        if (/^\|\s*<b>No/.test(line) || /^\|\s*:--:/.test(line)) continue; // header/separator rows

        const titleMatch = line.match(
            /\[([^\]]+)\]\((https:\/\/www\.codingame\.com[^)]*)\)/
        );
        if (!titleMatch) continue; // e.g. rows where the puzzle link is missing entirely

        const title = titleMatch[1].trim();
        const codingameUrl = titleMatch[2].trim();

        const solutionLinkRe = /\[([^\]]+)\]\((https:\/\/github\.com[^)]*)\)/g;
        const repoSolutionUrls = [];
        let m;
        while ((m = solutionLinkRe.exec(line)) !== null) {
            const lang = m[1].trim();
            const url = m[2].trim().replace(REPO_NAME_FIX, 'github.com/HCABurns/CodinGame-Solutions');
            repoSolutionUrls.push({ lang, url });
        }

        // Tags = last column of the row.
        const cols = line.split('|').map((c) => c.trim());
        const lastCol = cols[cols.length - 2] || ''; // last real column before trailing empty from split
        const tags = lastCol
            .split(/<br\s*\/?>/i)
            .map((t) => t.trim())
            .filter(Boolean);

        puzzles.push({ title, difficulty, codingameUrl, repoSolutionUrls, tags });
    }

    // Sanity: de-dupe by codingameUrl (keep first occurrence) in case a row repeats.
    const seen = new Set();
    const deduped = puzzles.filter((p) => {
        if (seen.has(p.codingameUrl)) return false;
        seen.add(p.codingameUrl);
        return true;
    });

    const byDifficulty = deduped.reduce((acc, p) => {
        acc[p.difficulty] = (acc[p.difficulty] || 0) + 1;
        return acc;
    }, {});

    console.log(`Parsed ${deduped.length} puzzles:`, byDifficulty);

    const outPath = path.join(__dirname, '..', 'data', 'puzzles.json');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(deduped, null, 2));
    console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

// One-time enrichment: fetches the full puzzle statement (HTML) from CodinGame's
// own JSON API for every entry in docs/data/puzzles.json and stores a cleaned
// plain-text version as `statementText`. No JS rendering needed — this endpoint
// returns plain JSON. Run with: node scripts/fetch-statements.js
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'docs', 'data', 'puzzles.json');
const ENDPOINT = 'https://www.codingame.com/services/Puzzle/findProgressByPrettyId';
const DELAY_MS = 250;

function prettyIdFromUrl(codingameUrl) {
    const u = new URL(codingameUrl);
    const segments = u.pathname.split('/').filter(Boolean);
    let last = segments[segments.length - 1];
    if (last === 'solution' || last === 'discuss') last = segments[segments.length - 2];
    return decodeURIComponent(last);
}

const NAMED_ENTITIES = {
    nbsp: ' ', ensp: ' ', le: '<=', ge: '>=', lt: '<', gt: '>', amp: '&', quot: '"',
    apos: "'", rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"', ndash: '-', mdash: '--',
    hellip: '...', bull: '*', deg: 'deg', times: 'x', minus: '-', reg: '(R)', copy: '(C)',
    euro: 'EUR', pound: 'GBP', pi: 'pi', laquo: '<<', raquo: '>>', prime: "'", isin: 'in',
    radic: 'sqrt', plusmn: '+/-', ne: '!=', larr: '<-', rarr: '->', darr: 'v', uarr: '^',
    harr: '<->', eacute: 'e', agrave: 'a', ecirc: 'e', Agrave: 'A', ccedil: 'c', icirc: 'i',
    egrave: 'e', sup2: '^2', sup3: '^3', ouml: 'o', uuml: 'u', auml: 'a', curren: 'currency',
};

function decodeEntities(text) {
    return text
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
        .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (m, name) => (name in NAMED_ENTITIES ? NAMED_ENTITIES[name] : m));
}

function htmlToText(html) {
    if (!html) return '';
    return decodeEntities(
        html
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<h2[^>]*>/gi, '\n\n## ')
            .replace(/<\/h2>/gi, '\n')
            .replace(/<(p|div|li|pre)[^>]*>/gi, '\n')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, '')
    )
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

async function fetchStatement(prettyId) {
    const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        body: JSON.stringify([prettyId, null]),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.id === -3 || !data.statement) return null;
    return { title: data.title, story: data.contentDetails?.story || '', statement: data.statement };
}

async function main() {
    const puzzles = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    let ok = 0, failed = 0;

    for (let i = 0; i < puzzles.length; i++) {
        const p = puzzles[i];
        const prettyId = prettyIdFromUrl(p.codingameUrl);
        try {
            const result = await fetchStatement(prettyId);
            if (result) {
                const parts = [decodeEntities(result.story), htmlToText(result.statement)].filter(Boolean);
                p.statementText = parts.join('\n\n').trim();
                ok++;
            } else {
                p.statementText = null;
                failed++;
                console.log(`No statement for "${p.title}" (prettyId=${prettyId})`);
            }
        } catch (err) {
            p.statementText = null;
            failed++;
            console.log(`Error for "${p.title}" (prettyId=${prettyId}): ${err.message}`);
        }

        if ((i + 1) % 25 === 0) console.log(`${i + 1}/${puzzles.length}...`);
        await new Promise((r) => setTimeout(r, DELAY_MS));
    }

    fs.writeFileSync(DATA_PATH, JSON.stringify(puzzles, null, 2));
    console.log(`Done. ok=${ok} failed=${failed}. Wrote ${DATA_PATH}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

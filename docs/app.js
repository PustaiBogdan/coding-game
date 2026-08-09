// Editable any time — these are the exact prompts sent to Claude when you tap
// "Rezolvă cu Claude". CodinGame's puzzle pages are a JS app with no server-rendered
// content, so Claude's own web-fetch can't read them — the statement is pre-extracted
// (see scripts/fetch-statements.js) and embedded directly below instead of a link.
const PROMPT_WITH_STATEMENT = `CodinGame puzzle: {{TITLE}}

--- Statement ---
{{STATEMENT}}
--- End statement ---

--- Input spec (CodinGame's own stub generator — this is exactly how their IDE parses
input for this puzzle, match it precisely so the Scanner code lines up 1:1 with it) ---
{{STUB}}
--- End input spec ---
Legend: "read x:int/string" = read one line, parse to that type. "loopline N x:type" =
loop N times, one value per line. "loop N read a:t b:t" = loop N times, one line with
multiple space-separated values. "gameloop" = repeat every turn until the game ends.

Reply in English, kept tight (no filler):
1. One short paragraph: what the puzzle asks, input/output format.
2. A complete Java solution that passes all tests — correct and readable, the kind a person
   would actually write, not a golfed one-liner. Use CodinGame's standard Java template
   (Scanner-based input reading, class Solution with main), and read input in exactly the
   order given in the input spec above.
3. A few short bullet points on the core idea/approach. Add inline comments only on the
   non-obvious lines of the code, not a comment on every line.`;

// Fallback for the rare puzzle whose statement we couldn't pre-extract — Claude's
// web-fetch likely can't read the page either (client-rendered), so it's told that upfront.
const PROMPT_FALLBACK = `CodinGame puzzle "{{TITLE}}": {{URL}}
Note: this is a JS-rendered page, your fetch tool probably can't read the statement from it.
If you can't read it, say so plainly instead of guessing from the title.

If you can read it, reply in English, kept tight (no filler):
1. One short paragraph: what the puzzle asks, input/output format.
2. A complete Java solution that passes all tests — correct and readable, the kind a person
   would actually write, not a golfed one-liner. Use CodinGame's standard Java template
   (Scanner-based input reading, class Solution with main).
3. A few short bullet points on the core idea/approach. Add inline comments only on the
   non-obvious lines of the code, not a comment on every line.`;

/** @type {Array<{title:string, difficulty:string, codingameUrl:string, tags:string[], repoSolutionUrls:{lang:string,url:string}[]}>} */
let puzzles = [];

const searchInput = document.getElementById('search');
const resultsEl = document.getElementById('results');
const countEl = document.getElementById('count');
const rowTemplate = document.getElementById('row-template');

fetch('data/puzzles.json')
    .then((r) => r.json())
    .then((data) => {
        puzzles = data;
        render('');
    })
    .catch((err) => {
        resultsEl.innerHTML = `<li class="empty">Nu am putut încărca lista de probleme.</li>`;
        console.error(err);
    });

searchInput.addEventListener('input', () => render(searchInput.value.trim()));

function score(puzzle, query) {
    const q = query.toLowerCase();
    const title = puzzle.title.toLowerCase();
    if (title === q) return 100;
    if (title.startsWith(q)) return 80;
    if (title.includes(q)) return 60;
    if (puzzle.tags.some((t) => t.toLowerCase().includes(q))) return 30;
    return 0;
}

function render(query) {
    resultsEl.innerHTML = '';

    if (!query) {
        countEl.textContent = `${puzzles.length} probleme disponibile — scrie pentru a căuta`;
        return;
    }

    const matches = puzzles
        .map((p) => ({ p, s: score(p, query) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s || a.p.title.localeCompare(b.p.title))
        .slice(0, 40)
        .map((x) => x.p);

    countEl.textContent = `${matches.length} rezultat${matches.length === 1 ? '' : 'e'}`;

    if (matches.length === 0) {
        resultsEl.innerHTML = `<li class="empty">Nicio problemă găsită.</li>`;
        return;
    }

    for (const puzzle of matches) {
        resultsEl.appendChild(buildRow(puzzle));
    }
}

function buildRow(puzzle) {
    const node = rowTemplate.content.cloneNode(true);
    const row = node.querySelector('.row');
    const head = node.querySelector('.row-head');
    const detail = node.querySelector('.detail');
    const difficultyEl = node.querySelector('.difficulty');
    const titleEl = node.querySelector('.title');
    const tagsEl = node.querySelector('.tags');
    const linksEl = node.querySelector('.links');
    const solveBtn = node.querySelector('.solve-btn');

    difficultyEl.textContent = puzzle.difficulty;
    difficultyEl.dataset.level = puzzle.difficulty;
    titleEl.textContent = puzzle.title;
    tagsEl.textContent = puzzle.tags.join(' · ');

    const cgLink = document.createElement('a');
    cgLink.href = puzzle.codingameUrl;
    cgLink.target = '_blank';
    cgLink.rel = 'noopener';
    cgLink.textContent = 'Enunț CodinGame ↗';
    linksEl.appendChild(cgLink);

    for (const sol of puzzle.repoSolutionUrls) {
        const a = document.createElement('a');
        a.href = sol.url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = `Referință ${sol.lang} ↗`;
        linksEl.appendChild(a);
    }

    const prompt = puzzle.statementText
        ? PROMPT_WITH_STATEMENT.replace('{{TITLE}}', puzzle.title)
              .replace('{{STATEMENT}}', puzzle.statementText)
              .replace('{{STUB}}', puzzle.stubGenerator || '(not available — infer the reading order from the statement)')
        : PROMPT_FALLBACK.replace('{{TITLE}}', puzzle.title).replace('{{URL}}', puzzle.codingameUrl);
    solveBtn.href = `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;

    head.addEventListener('click', () => {
        const isOpen = !detail.hidden;
        document.querySelectorAll('.detail').forEach((d) => (d.hidden = true));
        detail.hidden = isOpen;
    });

    return row;
}

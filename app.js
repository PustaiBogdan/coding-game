// Editable any time — this is the exact prompt sent to Claude when you tap
// "Rezolvă cu Claude". {{URL}} gets replaced with the puzzle's real CodinGame link.
const PROMPT_TEMPLATE = `Open and read this CodinGame puzzle page: {{URL}}
Base your answer on the actual statement there, not just the title.

Reply in English, kept tight (no filler):
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

    const prompt = PROMPT_TEMPLATE.replace('{{URL}}', puzzle.codingameUrl);
    solveBtn.href = `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;

    head.addEventListener('click', () => {
        const isOpen = !detail.hidden;
        document.querySelectorAll('.detail').forEach((d) => (d.hidden = true));
        detail.hidden = isOpen;
    });

    return row;
}

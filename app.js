// Editable any time — this is the exact prompt sent to Claude when you tap
// "Rezolvă cu Claude". {{URL}} gets replaced with the puzzle's real CodinGame link.
const PROMPT_TEMPLATE = `Rezolvă problema CodinGame de la acest link: {{URL}}

Structurează răspunsul așa, mereu în limba română:
1. Explică enunțul problemei și formatul inputului/outputului, pe scurt.
2. Dă o soluție completă în Java care trece toate testele — corectă și clară, nu neapărat
   super-optimizată, o soluție la care ar putea ajunge un om care rezolvă problema cu mintea
   limpede, nu un cod ultra-compact sau plin de trucuri.
3. La final, explică logica din spatele soluției — ce idee ai folosit și de ce, eventual cu
   comentarii pe liniile mai puțin evidente din cod.`;

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

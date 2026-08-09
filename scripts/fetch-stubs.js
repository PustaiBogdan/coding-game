// One-time enrichment: for every puzzle, load its CodinGame statement page with a
// real headless browser, click "Solve it", and capture the `stubGenerator` spec
// CodinGame itself uses to auto-generate the per-language starter code. This is the
// only way to get it — the page is a client-rendered SPA and this specific flow
// needs a real session, not a plain fetch. Run with: node scripts/fetch-stubs.js
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const DATA_PATH = path.join(__dirname, '..', 'docs', 'data', 'puzzles.json');

async function fetchStub(page, puzzle) {
    const responsePromise = page
        .waitForResponse(
            (r) => r.url().includes('/services/TestSession/startTestSession') && r.status() === 200,
            { timeout: 15000 }
        )
        .catch(() => null);

    await page.goto(puzzle.codingameUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const solveLink = page.locator('a:has-text("Solve it")').first();
    await solveLink.waitFor({ timeout: 15000 });
    await solveLink.click();

    const response = await responsePromise;
    if (!response) return null;
    const data = await response.json();
    const question = data?.currentQuestion?.question;
    return question?.stubGenerator || null;
}

async function main() {
    const puzzles = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    const browser = await chromium.launch();
    const page = await browser.newPage();
    let ok = 0, failed = 0;

    for (let i = 0; i < puzzles.length; i++) {
        const p = puzzles[i];
        if (p.stubGenerator !== undefined) { ok += p.stubGenerator ? 1 : 0; continue; } // resume: skip already-processed
        try {
            const stub = await fetchStub(page, p);
            p.stubGenerator = stub || null;
            if (stub) ok++;
            else {
                failed++;
                console.log(`No stub for "${p.title}"`);
            }
        } catch (err) {
            p.stubGenerator = null;
            failed++;
            console.log(`Error for "${p.title}": ${err.message.split('\n')[0]}`);
        }

        if ((i + 1) % 10 === 0) {
            console.log(`${i + 1}/${puzzles.length}...`);
            fs.writeFileSync(DATA_PATH, JSON.stringify(puzzles, null, 2)); // checkpoint
        }
    }

    await browser.close();
    fs.writeFileSync(DATA_PATH, JSON.stringify(puzzles, null, 2));
    console.log(`Done. ok=${ok} failed=${failed}. Wrote ${DATA_PATH}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

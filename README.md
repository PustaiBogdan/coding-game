# CodinGame Prep

Index căutabil (client-side, fără backend) peste cele 300 de probleme din
[HCABurns/CodinGame-Solutions](https://github.com/HCABurns/CodinGame-Solutions).

Caută o problemă → vezi enunțul real CodinGame + soluțiile de referință din repo (alte
limbaje) → apeși "Rezolvă cu Claude" ca să obții live, în claude.ai, o soluție Java +
explicație în română, după un prompt fix definit în `app.js` (`PROMPT_TEMPLATE`).

## Regenerare index

Dacă repo-ul sursă mai adaugă probleme, rulează din nou:

```bash
node scripts/build-index.js
```

Suprascrie `data/puzzles.json`.

## Dev local

```bash
node scripts/dev-server.js
```

Deschide `http://localhost:5173`.

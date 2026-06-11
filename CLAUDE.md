# Earth Defense

@.claude/contesto-progetto.md

Quando compatti, preserva sempre la lista dei file modificati e gli id dei path SVG animabili.

**i18n obbligatorio**: ogni nuova stringa visibile all'utente deve passare dal sistema i18n (`src/i18n/`) con la traduzione in ENTRAMBI i dizionari `it.ts` e `en.ts` — mai testo hardcoded nei componenti. La sim non importa mai i18n: gli errori dei comandi sono codici (`CommandErrorCode`) tradotti dalla UI con `t('cmd.<code>')`. Nomi dinamici (città/paesi/regioni) via `cityName`/`countryName`/`regionName`. Superfici che non si ridisegnano da sole vanno agganciate al callback `onLanguageChange` in `main.ts`.

Il diario delle sessioni di lavoro è in docs/sessioni/INDICE.md. A inizio sessione, annota il commit corrente come punto di partenza e, se serve contesto sulle scelte passate, consulta l'indice e leggi solo le sessioni rilevanti. A fine sessione, quando l'utente chiede di chiudere la sessione: committa l'eventuale lavoro in sospeso, crea il file della nuova sessione numerata progressivamente in docs/sessioni/ con resoconto, decisioni, file modificati e intervallo di commit nel formato "commit #N (hash breve)", aggiorna l'INDICE.md e aggiorna .claude/contesto-progetto.md con lo stato corrente del progetto.

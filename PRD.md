# PRD - Math Academy App

Versione: 3.4
Data: 09 Febbraio 2026
Stato: In implementazione (aggiornato a knowledge graph unificato docente/studente)

## 1. Obiettivo Prodotto
Math Academy supporta una didattica blended:
- lezione frontale LIM guidata dal docente (argomento atomizzato + esercizi in classe con timer),
- esercitazione autonoma studente con assegnazioni, scadenze, tracciamento tentativi e gamification,
- monitoraggio docente a livello classe e singolo studente,
- gestione progressiva tramite knowledge graph a livelli sbloccabili.

## 2. Requisiti Docente

### 2.0 Gestione classi e import CSV
Requisito:
- creare classi,
- importare studenti da CSV con colonne `nome,cognome,email`.

Implementazione:
- endpoint `GET/POST/PATCH/DELETE /api/teacher/classes`,
- pagina `src/app/teacher/classes/page.tsx`,
- import CSV con creazione studente (password iniziale generata) o link a studente esistente,
- enrollment automatico in classe.

### 2.1 Lezione LIM atomizzata + timer + soglia passaggio + PDF
Requisito:
- creare lezione LIM su argomento atomizzato,
- includere esempi ed esercizi in classe con timer,
- mostrare percentuale successo per passaggio fase successiva,
- ottenere PDF della lezione.

Implementazione:
- campi lezione: `inClassTimerMinutes`, `passThresholdPercent`, `lastSuccessPercent`,
- editor creazione lezione con timer/soglia (`src/app/teacher/lessons/new/page.tsx`),
- presenter con timer, inserimento percentuale successo e decisione pass/fail (`src/app/teacher/lessons/[id]/present/page.tsx`),
- salvataggio metriche via `PATCH /api/teacher/lessons/[id]`,
- export PDF via `GET /api/teacher/lessons/[id]/pdf`.
- generazione AI con schema JSON rigido (lessonTitle, lessonDescription, slide strutturate),
- fallback deterministico con contenuto didattico concreto usando esercizi già presenti nel topic (niente placeholder).

### 2.1.1 Assegnazione esercizi a classe o singolo studente, con scadenza
Requisito:
- assegnare compiti a classe intera e/o granularmente a studenti,
- impostare scadenza.

Implementazione:
- endpoint `GET/POST /api/teacher/assignments`,
- pagina `src/app/teacher/assignments/page.tsx`,
- selezione classe, studenti specifici, argomento e sotto-argomenti,
- scadenza obbligatoria e stato per target studente.

### 2.2 Creazione esercizi + spaced learning automatico
Requisito:
- docente sceglie argomento, sotto-argomenti, numero esercizi,
- attiva spaced learning per inserimento automatico futuro.

Implementazione:
- creazione assignment con `knowledgePointId`, `subtopics`, `exerciseCount`, `spacedLearningEnabled`,
- attivazione `StudentSpacedTopic` per gli studenti assegnati,
- endpoint daily esercizi integra i topic spaced (`/api/exercises/daily`).

### 2.3 Monitoraggio esiti classe e studente
Requisito:
- dashboard per singolo studente e complessiva classe.

Implementazione:
- dashboard docente con snapshot studenti e metriche aggregate,
- pagina gestione studenti con KPI (`src/app/teacher/students/page.tsx`),
- metriche assignment: progress medio, completati, tentativi per target.

## 3. Requisiti Studente

### 3.1 Ricezione compiti con scadenza
Implementazione:
- endpoint `GET /api/student/assignments`,
- dashboard studente mostra compiti assegnati, stato, scadenza,
- apertura diretta compito su `/exercises?assignment=<id>`.

### 3.2 Profilo: nickname e immagine
Implementazione:
- endpoint `GET/PATCH /api/student/profile`,
- form dashboard per salvare nickname/avatarUrl.

### 3.3 XP e monete pi-greco
Implementazione:
- KPI in dashboard (`/api/user/stats`) + reward per tentativo corretto.

### 3.4 Log completo tentativi/errori/successi
Implementazione:
- endpoint `GET /api/student/activity`,
- log storico in dashboard con esito, XP/monete e timestamp,
- tracciamento assignment-aware in `ExerciseAttempt.assignmentId`.

### 3.5 Premi/skin
Stato:
- roadmap futura, non ancora implementato.

## 4. Verifica generazione esercizi LLM
Requisito:
- verificare funzionamento della generazione con provider LLM.

Implementazione:
- endpoint `POST /api/teacher/llm/verify` (test connessione e generazione sample),
- pulsante verifica nella pagina docente esercizi (`src/app/teacher/exercises/page.tsx`),
- fallback multi-endpoint/model su GLM con diagnostica dettagliata (status + body snippet) per ridurre errori 400/404 e facilitare debug.

## 4.1 Generazione/Import JSON esercizi (schema + prompt)
Requisito:
- mostrare nello stesso punto operativo il prompt consigliato e lo schema JSON,
- importare bundle JSON con teoria, suggerimenti, esempi ed esercizi.

Implementazione:
- endpoint `POST /api/teacher/exercises/import`,
- sezione dedicata in `src/app/teacher/exercises/page.tsx` con:
  - schema JSON di riferimento,
  - prompt template per LLM,
  - textarea import JSON e salvataggio su argomento selezionato.
- in `src/app/teacher/lessons/new/page.tsx` è visibile lo schema JSON usato per la generazione lezione.

## 5. Knowledge Graph a livelli indentati e sblocco progressivo
Requisito:
- livelli distinti che si aprono progressivamente/indentati.

Implementazione:
- endpoint docente `GET /api/teacher/knowledge-points?mode=flat` con `depth=layer`,
- endpoint studente `GET /api/knowledge-graph?mode=flat` per rendering ad albero completo,
- componente mappa studente aggiornato con UX ad albero stile viewer (ricerca + anno + categoria + topic),
- dettaglio nodo con teoria/suggerimenti/esempi/esercizi importati.
- selettore docente riusabile (`src/components/TeacherTopicSelector.tsx`) allineato alla stessa UX della mappa studente:
  - sidebar con ricerca,
  - albero espandibile anno/categoria/topic,
  - pannello dettaglio con prerequisiti, topic sbloccati, interferenze.
- utilita tassonomica condivisa (`src/lib/knowledge-graph-tree.ts`) usata sia da docente sia da studente per costruzione albero e path.

## 5.1 Rendering formule matematiche
Requisito:
- visualizzare formule matematiche con resa tipografica adeguata.

Implementazione:
- rendering KaTeX lato client tramite CDN (`katex` + `auto-render`),
- componente `src/components/KatexContent.tsx`,
- applicazione in:
  - mappa conoscenza,
  - pagina studio argomento,
  - pagina esercizi studente,
  - anteprima/presentazione lezioni LIM.

## 6. Modello Dati (Sintesi)
Nuove entita principali introdotte:
- `Classroom`, `ClassEnrollment`,
- `HomeworkAssignment`, `HomeworkAssignmentExercise`, `HomeworkAssignmentTarget`,
- `StudentSpacedTopic`.

Estensioni:
- `User`: `nickname`, `avatarUrl`,
- `Lesson`: timer/soglia/successo,
- `ExerciseAttempt`: collegamento opzionale ad assignment.
- `KnowledgePoint`: `theoryContent`, `tipsContent`, `examplesContent`.

### 6.1 Modello Knowledge Graph raccomandato (corretto)
Problema osservato:
- con dataset molto "piatto" (molti nodi root o prerequisiti non gerarchici), la sola coppia `layer + prerequisites[]` non garantisce una UX stabile per selezione "principale -> sotto -> sotto-sotto".

Indicazione progettuale:
- mantenere `prerequisites[]` per le dipendenze didattiche,
- aggiungere anche una struttura tassonomica esplicita (consigliato) per la navigazione UI:
  - `parentId` (albero di navigazione),
  - `sortOrder` (ordine locale),
  - `taxonomyPath` (es. `Numeri/Frazioni/Somma frazioni`).

Nota:
- dipendenze (grafo) e tassonomia (albero) devono restare separate: un nodo puo avere `parentId` unico ma piu prerequisiti.
- stato corrente implementato: costruzione UI macro-argomento -> sotto-argomenti con grouping coerente per id/titolo topic.
- l'intestazione anni in UI e stata normalizzata a 5 cicli scolastici fissi: `1°`, `2°`, `3°`, `4°`, `5°`.
- passo successivo consigliato: persistenza DB di `taxonomyPath/parentId/sortOrder` per stabilizzare ulteriormente il clustering su dataset estesi.

## 7. Stato Funzionale
Implementato in questa release:
- classi + CSV,
- assegnazioni con scadenza classe/singolo,
- spaced learning automatico su assignment,
- dashboard studente con compiti, profilo e log,
- export PDF lezione,
- controllo timer e percentuale successo in presentazione LIM (timer attivo solo su slide `exercise`),
- verifica provider LLM lato docente,
- import JSON guidato (prompt + schema) in area esercizi docente,
- rendering KaTeX esteso nelle viste didattiche,
- knowledge graph progressivo con dettaglio contenuti importati,
- knowledge graph docente/studente unificato con stessa UX ad albero (ricerca + espansione + dettaglio prerequisiti/sblocchi/interferenze),
- raggruppamento macro/sotto-argomenti con 5 tab anno standard (`1°..5°`) per coerenza didattica verticale,
- generazione lezione AI robusta con normalizzazione anti-placeholder (evita slide vuote/scheletro),
- aggiornamento PRD e schema dati.

A completamento successivo (roadmap):
- economia premi/skin,
- analitiche avanzate longitudinali classe,
- editor visuale avanzato per struttura atomica multi-step.

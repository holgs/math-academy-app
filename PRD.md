# PRD - Math Academy App

Versione: 3.0
Data: 07 Febbraio 2026
Stato: In implementazione (aggiornato alle funzionalita docente/studente richieste)

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
- pulsante verifica nella pagina docente esercizi (`src/app/teacher/exercises/page.tsx`).

## 5. Knowledge Graph a livelli indentati e sblocco progressivo
Requisito:
- livelli distinti che si aprono progressivamente/indentati.

Implementazione:
- endpoint docente `GET /api/teacher/knowledge-points?mode=flat` con `depth=layer`,
- menu progressivo su argomenti (navigazione per layer/prerequisiti),
- knowledge graph studente mantiene unlock via prerequisiti e stato progress.

## 6. Modello Dati (Sintesi)
Nuove entita principali introdotte:
- `Classroom`, `ClassEnrollment`,
- `HomeworkAssignment`, `HomeworkAssignmentExercise`, `HomeworkAssignmentTarget`,
- `StudentSpacedTopic`.

Estensioni:
- `User`: `nickname`, `avatarUrl`,
- `Lesson`: timer/soglia/successo,
- `ExerciseAttempt`: collegamento opzionale ad assignment.

## 7. Stato Funzionale
Implementato in questa release:
- classi + CSV,
- assegnazioni con scadenza classe/singolo,
- spaced learning automatico su assignment,
- dashboard studente con compiti, profilo e log,
- export PDF lezione,
- controllo timer e percentuale successo in presentazione LIM,
- verifica provider LLM lato docente,
- aggiornamento PRD e schema dati.

A completamento successivo (roadmap):
- economia premi/skin,
- analitiche avanzate longitudinali classe,
- editor visuale avanzato per struttura atomica multi-step.

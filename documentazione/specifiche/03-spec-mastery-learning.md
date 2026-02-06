# Specifiche Funzionali: Mastery Learning Engine

## 📋 Documento di Specifica (PRD)

**Modulo:** Mastery Learning System
**Versione:** 1.0
**Data:** 2026-01-31

---

## 1. Panoramica

### 1.1 Scopo
Garantire che ogni studente raggiunga una padronanza completa dei concetti prima di avanzare, eliminando le lacune cognitive nel Knowledge Graph.

### 1.2 Obiettivi
- Padronanza del 100% dei prerequisiti prima di sbloccare nuovi argomenti.
- Tempo variabile, apprendimento fisso.
- Zero avanzamento basato solo sul tempo trascorso.

---

## 2. Requisiti Funzionali

### 2.1 Mastery Level Tracker

**RF-ML-001: Definizione Livello di Padronanza**
```typescript
enum MasteryStatus {
  NOT_STARTED = 'not_started',
  LEARNING = 'learning',
  PRACTICING = 'practicing',
  STABILIZING = 'stabilizing',
  MASTERED = 'mastered',
  LOCKED = 'locked'
}

interface MasteryNode {
  topicId: string;
  status: MasteryStatus;
  score: number; // 0-100
  lastAssessment: Date;
  consecutiveCorrect: number; // Contatore per il superamento
}
```

**RF-ML-002: Requisiti di Sblocco**
- Un nodo entra in `NOT_STARTED` solo quando tutti i suoi `parentNodes` diretti nel Knowledge Graph sono in stato `MASTERED`.
- Altrimenti, il nodo rimane in `LOCKED`.

### 2.2 Assessment Engine

**RF-ML-003: Valutazione Padronanza**
- Per passare da `PRACTICING` a `MASTERED`, lo studente deve risolvere $N$ problemi consecutivi correttamente (default $N=3$).
- Se un problema viene sbagliato, `consecutiveCorrect` viene resettato a 0.

**RF-ML-004: Adattamento della Soglia**
```typescript
interface MasteryThreshold {
  topicComplexity: 1 | 2 | 3 | 4 | 5;
  requiredConsecutive: number; // Es: 2 per facile, 5 per difficile
  minTimeSpent: number; // Minuti minimi di impegno attivo
}
```

### 2.3 Gatekeeping System

**RF-ML-005: Blocco Navigazione**
- L'interfaccia utente non permette di cliccare o visualizzare contenuti di argomenti `LOCKED`.
- Messaggio di sistema: "Padroneggia prima: [Lista Prerequisiti]" con link diretti ai nodi da completare.

---

## 3. Requisiti Non Funzionali

### 3.1 Integrità del Grafo
- Il sistema deve validare ciclicamente il grafo per evitare dipendenze circolari che bloccherebbero lo studente per sempre.

### 3.2 Feedback Motivazionale
- Mostrare chiaramente i progressi verso la soglia di padronanza (es. "Ancora 2 risposte corrette per sbloccare Algebra II").

---

## 4. User Stories

### US-ML-001: Tentativo di Sblocco
```
COME studente
VOGLIO sapere quali argomenti devo studiare prima di iniziare uno nuovo
IN MODO DA non sentirmi perso o confuso
CRITERIO: Visualizzazione chiara dei prerequisiti mancanti.
```

### US-ML-002: Raggiungimento Padronanza
```
COME studente
VOGLIO ricevere una conferma quando ho padroneggiato un argomento
IN MODO DA sentire il progresso e sbloccare nuove sfide
CRITERIO: Transizione di stato a MASTERED e notifica visiva.
```

---

## 5. Rischi e Mitigazioni

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|-------------|---------|-------------|
| Studente bloccato in un loop | Media | Alta | Trigger automatico di Remediation Mirata (Pilastro 11) |
| Frustrazione da precisione richiesta | Alta | Media | Supporto tramite suggerimenti (scaffolding) |

---
*Specifiche per sviluppo - Progetto Math Academy Method*

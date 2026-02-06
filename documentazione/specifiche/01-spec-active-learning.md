# Specifiche Funzionali: Active Learning Module

## 📋 Documento di Specifica (PRD)

**Modulo:** Active Learning Engine
**Versione:** 1.0
**Data:** 2026-01-31

---

## 1. Panoramica

### 1.1 Scopo
Implementare un sistema che forza l'apprendimento attivo eliminando la fruizione passiva e massimizzando il tempo di risoluzione problemi.

### 1.2 Obiettivi
- Rapporto attivo/passivo ≥ 7:1
- First-attempt success rate ≥ 90%
- Zero possibilità di "skip" senza tentativo

---

## 2. Requisiti Funzionali

### 2.1 Knowledge Point Manager

**RF-AL-001: Struttura Knowledge Point**
```typescript
interface KnowledgePoint {
  id: string;
  topicId: string;
  order: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  introduction: {
    text: string;
    maxLength: 500; // caratteri
  };
  workedExample: {
    problem: string;
    solution: Step[];
    explanation: string;
  };
  practiceProblems: Problem[]; // min 2, max 5
  prerequisiteKPs: string[];
}
```

**RF-AL-002: Progressione Automatica**
- Sistema blocca avanzamento se KP non padroneggiato
- Padronanza = 2 risposte corrette consecutive su problemi simili
- Se fallimento: ritorno a esempio + nuovo problema

### 2.2 Active Exercise Engine

**RF-AL-003: Generazione Problemi**
```typescript
interface ProblemGenerator {
  generateSimilar(workedExample: Problem): Problem[];
  adjustDifficulty(level: number): void;
  ensureVariety(existingProblems: Problem[]): Problem;
}
```

**RF-AL-004: No-Skip Policy**
- Nessun pulsante "Non so" durante apprendimento
- Opzioni disponibili:
  - "Mostra suggerimento" (penalità: richiede problema extra)
  - "Rivedi esempio" (timer 30 sec prima di riprovare)
  - "Prova risposta" (obbligatorio)

**RF-AL-005: Timer di Attivazione**
- Dopo esempio svolto: max 10 secondi prima che appaia primo problema
- Nessuna possibilità di "contemplare" passivamente

### 2.3 Feedback System

**RF-AL-006: Feedback Immediato**
```typescript
interface FeedbackResponse {
  isCorrect: boolean;
  correctAnswer?: string;
  solutionSteps?: Step[];
  commonMistake?: string;
  nextAction: 'advance' | 'retry' | 'remediate';
}
```

**RF-AL-007: Timing Feedback**
- Feedback entro 500ms dalla sottomissione
- Se errato: soluzione visibile per min 5 secondi
- Problema successivo appare automaticamente

### 2.4 Engagement Tracker

**RF-AL-008: Metriche Real-time**
```typescript
interface ActiveLearningMetrics {
  sessionId: string;
  totalProblemsAttempted: number;
  totalExamplesViewed: number;
  activePassiveRatio: number; // target: ≥ 7
  firstAttemptSuccessRate: number;
  averageTimePerProblem: number;
  hintsUsed: number;
}
```

**RF-AL-009: Enforcement**
- Se ratio < 5: alert al sistema
- Se tempo su esempio > 60s senza pratica: prompt forzato

---

## 3. Requisiti Non Funzionali

### 3.1 Performance
- Latenza feedback: < 500ms
- Generazione problema: < 2s
- Caricamento KP: < 1s

### 3.2 Usabilità
- UI minimale durante pratica (no distrazioni)
- Focus su area input/risposta
- Progressbar visibile per motivazione

### 3.3 Accessibilità
- Supporto screen reader
- Input da tastiera completo
- Font size regolabile

---

## 4. User Stories

### US-AL-001: Primo Contatto con KP
```
COME studente
VOGLIO vedere un breve esempio svolto
IN MODO DA capire il pattern da applicare
CRITERIO: Esempio visibile max 30s, poi prompt pratica
```

### US-AL-002: Pratica Attiva
```
COME studente
VOGLIO risolvere problemi simili all'esempio
IN MODO DA consolidare la comprensione
CRITERIO: Min 2 problemi corretti per avanzare
```

### US-AL-003: Feedback su Errore
```
COME studente
QUANDO sbaglio un problema
VOGLIO vedere la soluzione corretta e capire l'errore
IN MODO DA correggermi immediatamente
CRITERIO: Soluzione mostrata + nuovo problema simile
```

### US-AL-004: Blocco Avanzamento
```
COME sistema
QUANDO lo studente non dimostra padronanza
VOGLIO impedire l'avanzamento al KP successivo
IN MODO DA prevenire lacune
CRITERIO: Loop su KP corrente fino a padronanza
```

---

## 5. Wireframe Concettuale

```
┌─────────────────────────────────────────────────┐
│  Knowledge Point: Equazioni di Primo Grado      │
│  ═══════════════════════════════════════════    │
│                                                 │
│  📖 ESEMPIO SVOLTO                              │
│  ┌─────────────────────────────────────────┐   │
│  │ Risolvi: 2x + 3 = 7                      │   │
│  │                                          │   │
│  │ Passo 1: 2x = 7 - 3 = 4                 │   │
│  │ Passo 2: x = 4/2 = 2                    │   │
│  │                                          │   │
│  │ ✓ Soluzione: x = 2                      │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ⏱️ Inizia pratica tra 5 secondi...            │
│                                                 │
│  ────────────────────────────────────────────  │
│                                                 │
│  🎯 ORA PROVA TU                               │
│  ┌─────────────────────────────────────────┐   │
│  │ Risolvi: 3x + 5 = 14                    │   │
│  │                                          │   │
│  │ x = [_______]                           │   │
│  │                                          │   │
│  │       [Verifica]  [Rivedi Esempio]      │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Progresso: ████████░░ 80% (4/5 problemi)      │
└─────────────────────────────────────────────────┘
```

---

## 6. Dipendenze

- **Knowledge Graph:** Per prerequisiti KP
- **Problem Generator:** Per varianti problemi
- **Mastery Tracker:** Per decidere avanzamento
- **Spaced Repetition:** Per scheduling revisioni

---

## 7. Rischi e Mitigazioni

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|-------------|---------|-------------|
| Studente frustrato da no-skip | Alta | Media | Suggerimenti graduali, non punitivi |
| Problemi troppo simili | Media | Alta | Algoritmo varietà obbligatoria |
| Feedback errato | Bassa | Critica | Validazione risposte multiple |

---

## 8. Metriche di Successo

- **KPI 1:** Active/Passive ratio ≥ 7
- **KPI 2:** First-attempt success ≥ 90%
- **KPI 3:** Session completion rate ≥ 85%
- **KPI 4:** Time-to-mastery ridotto del 30%

---

*Specifiche per sviluppo - Progetto Math Academy Method*

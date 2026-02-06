# Specifiche Funzionali: Deliberate Practice Module

## 📋 Documento di Specifica (PRD)

**Modulo:** Deliberate Practice Engine
**Versione:** 1.0
**Data:** 2026-01-31

---

## 1. Panoramica

### 1.1 Scopo
Implementare un sistema che spinge lo studente costantemente oltre la sua zona di comfort attuale, focalizzandosi sul miglioramento della performance attraverso sforzo mirato e feedback.

### 1.2 Obiettivi
- Mantenere lo studente nella "Zona di Sviluppo Prossimale".
- Fornire feedback correttivo istantaneo.
- Isolare le abilità specifiche per il perfezionamento.

---

## 2. Requisiti Funzionali

### 2.1 Difficulty Calibration (Vygotsky Engine)

**RF-DP-001: Calibrazione Dinamica**
- Il sistema monitora il tempo di risposta e l'accuratezza in tempo reale.
- **Target Success Rate:** 75-85% (se > 85%, aumenta difficoltà; se < 70%, attiva scaffolding o remediation).

**RF-DP-002: Isolamento dell'Abilità**
```typescript
interface ExerciseSet {
  focusSkillId: string;
  distractorSkills: string[]; // Abilità già padroneggiate usate come contorno
  problemTemplates: string[];
  complexityConstraint: number; // Incremento graduale
}
```

### 2.2 Feedback & Correction

**RF-DP-003: Feedback Correttivo Istantaneo**
- Non limitarsi a dire "Sbagliato".
- Identificare il tipo di errore (es. errore di segno, errore procedurale).
- Mostrare il passaggio esatto in cui è avvenuto l'errore.

**RF-DP-004: Tentativo di Correzione Forzato**
- Dopo un errore, lo studente deve inserire la risposta corretta (anche se mostrata) per "sentire" il pattern corretto prima di procedere.

### 2.3 Perfezionamento Procedurale

**RF-DP-005: Riduzione dell'Esitazione**
- Se lo studente risponde correttamente ma impiega molto tempo (sopra il percentile 90 per quel compito), il sistema assegna problemi simili per fluidificare la procedura (Building Automaticity - Pilastro 7).

---

## 3. User Stories

### US-DP-001: La Sfida Giusta
```
COME studente
VOGLIO esercizi che non siano né troppo facili né impossibili
IN MODO DA rimanere motivato e imparare efficacemente
CRITERIO: Difficoltà adattiva basata sugli ultimi 5 tentativi.
```

### US-DP-002: Capire l'Errore
```
COME studente
QUANDO faccio un errore di calcolo
VOGLIO che il sistema mi indichi dove ho sbagliato invece di darmi solo il risultato
IN MODO DA correggere il mio processo mentale
CRITERIO: Feedback granulare sui passaggi intermedi.
```

---

## 4. Rischi e Mitigazioni

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|-------------|---------|-------------|
| Frustrazione da "eccessivo sforzo" | Alta | Media | Elementi di Gamification e messaggi di incoraggiamento |
| Calibrazione errata della difficoltà | Media | Alta | Algoritmo di fallback rapido a task più semplici |

---
*Specifiche per sviluppo - Progetto Math Academy Method*

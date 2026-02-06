# Specifiche Funzionali: Behavioral Incentives (Gamification)

## 📋 Documento di Specifica (PRD)

**Modulo:** Gamification & Motivation Engine
**Versione:** 1.0
**Data:** 2026-01-31

---

## 1. Panoramica

### 1.1 Scopo
Aumentare il coinvolgimento e la perseveranza dello studente allineando le ricompense del sistema con i comportamenti di apprendimento più efficaci.

### 1.2 Obiettivi
- Premiare lo sforzo cognitivo e la costanza piuttosto che il mero completamento.
- Creare un ciclo di feedback positivo tramite XP, Streaks e Classifiche.
- Evitare incentivi per comportamenti "anti-apprendimento" (gaming the system).

---

## 2. Requisiti Funzionali

### 2.1 XP Calculation Engine

**RF-GA-001: Formula XP Meritocratica**
- XP guadagnati = $BaseXP \times ComplessitàArgomento \times Efficienza$.
- L'efficienza è alta se il problema è risolto al primo tentativo e in tempi ragionevoli.
- **Zero XP** per ripetizioni di argomenti già masterizzati al di fuori del programma di revisione.

### 2.2 Continuity Mechanics (Streaks)

**RF-GA-002: Daily Streak**
- Incremento contatore per ogni giorno solare con almeno 10 minuti di attività o 5 problemi risolti.
- Notifiche push/telegram di "Daily Reminder" basate sul fuso orario dell'utente.

**RF-GA-003: Streak Freeze**
- Possibilità di "congelare" la striscia (es. weekend o malattia) acquistando un item con XP accumulati, per prevenire la demotivazione da perdita totale.

### 2.3 Social & Feedback

**RF-GA-004: Adaptive Leaderboards**
- Classifiche settimanali tra utenti con livello di conoscenza simile, per garantire una competizione equa.

**RF-GA-005: Sound & Visual Effects**
- Feedback immediato (suoni di successo, effetti particellari) al raggiungimento della padronanza o al completamento di una serie corretta.

---

## 3. User Stories

### US-GA-001: Sentire il Progresso
```
COME studente
VOGLIO vedere il mio punteggio XP crescere mentre affronto argomenti difficili
IN MODO DA sentirmi ripagato per la fatica
CRITERIO: Visualizzazione XP guadagnati dopo ogni esercizio.
```

### US-GA-002: La Sfida del Giorno
```
COME studente
VOGLIO mantenere la mia striscia di giorni consecutivi attiva
IN MODO DA sviluppare l'abitudine quotidiana allo studio
CRITERIO: Contatore streak visibile in dashboard.
```

---

## 4. Rischi e Mitigazioni

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|-------------|---------|-------------|
| Lo studente si concentra solo sui punti | Alta | Media | XP legati solo a nodi del Knowledge Graph non ancora completati o in revisione |
| Stress da competizione | Media | Bassa | Possibilità di nascondersi dalle classifiche (Privacy Mode) |

---
*Specifiche per sviluppo - Progetto Math Academy Method*

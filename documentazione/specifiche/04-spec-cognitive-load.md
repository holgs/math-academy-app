# Specifiche Funzionali: Cognitive Load Optimizer

## 📋 Documento di Specifica (PRD)

**Modulo:** Cognitive Load Manager
**Versione:** 1.0
**Data:** 2026-01-31

---

## 1. Panoramica

### 1.1 Scopo
Garantire che il carico cognitivo imposto allo studente non superi mai la capacità della memoria di lavoro, facilitando il trasferimento delle informazioni nella memoria a lungo termine.

### 1.2 Obiettivi
- Scomposizione atomica dei contenuti (Micro-Learning).
- Riduzione del carico "estraneo" (interfaccia pulita).
- Utilizzo efficace degli "Worked Examples".

---

## 2. Requisiti Funzionali

### 2.1 Content Atomization

**RF-CL-001: Knowledge Point Granularity**
- Ogni Knowledge Point (KP) deve contenere **una sola nuova idea** o procedura.
- Numero massimo di passaggi logici per KP: 5.

**RF-CL-002: Hierarchy Check**
```typescript
interface CognitiveStructure {
  kpId: string;
  intrinsicLoad: number; // 1-5 basato su numero elementi nuovi
  germaneLoad: number; // 1-5 basato su connessioni a schemi esistenti
}
```

### 2.2 Dual Coding & Scaffolding

**RF-CL-003: Worked Example Pairing**
- Ogni nuova tipologia di problema DEVE essere preceduta da un esempio svolto visibile lateralmente durante il primo tentativo dello studente (Scaffolding).

**RF-CL-004: Fading Effect**
- Lo scaffolding deve "svanire" gradualmente:
  - Problema 1: Esempio completo visibile.
  - Problema 2: Suggerimenti sui passaggi intermedi.
  - Problema 3: Solo testo del problema.

### 2.3 UI Minimalism

**RF-CL-005: Eliminazione del Carico Estraneo**
- Durante la fase di risoluzione, l'interfaccia deve nascondere:
  - Menu di navigazione.
  - Classifiche/XP (possono apparire solo a fine esercizio).
  - Notifiche non urgenti.

---

## 3. User Stories

### US-CL-001: Apprendimento Passo-Passo
```
COME studente
VOGLIO che i nuovi concetti mi siano spiegati in piccoli pezzi
IN MODO DA non sentirmi sopraffatto
CRITERIO: Ogni lezione dura meno di 2 minuti di lettura.
```

### US-CL-002: L'Esempio come Guida
```
COME studente
VOGLIO poter consultare l'esempio svolto mentre provo il mio primo esercizio
IN MODO DA imitare il procedimento corretto
CRITERIO: Layout split-screen (Esempio | Esercizio).
```

---

## 4. Rischi e Mitigazioni

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|-------------|---------|-------------|
| Eccessiva frammentazione (noia) | Media | Bassa | Velocizzare la progressione per studenti avanzati |
| Dipendenza eccessiva dagli esempi | Alta | Media | Implementazione del Fading Effect obbligatorio |

---
*Specifiche per sviluppo - Progetto Math Academy Method*

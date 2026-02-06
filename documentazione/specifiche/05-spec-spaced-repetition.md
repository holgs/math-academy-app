# Specifiche Funzionali: FIRe Engine (Spaced Repetition)

## 📋 Documento di Specifica (PRD)

**Modulo:** Fractional Implicit Repetition (FIRe)
**Versione:** 1.0
**Data:** 2026-01-31

---

## 1. Panoramica

### 1.1 Scopo
Massimizzare la ritenzione a lungo termine delle conoscenze matematiche utilizzando un sistema di ripetizione spaziata intelligente che tiene conto sia dei richiami espliciti che di quelli impliciti.

### 1.2 Obiettivi
- Implementare la ripetizione spaziata su scala di migliaia di nodi.
- Ridurre il tempo di revisione "noiosa" tramite il monitoraggio delle competenze implicite.
- Garantire un tasso di ritenzione ≥ 95%.

---

## 2. Requisiti Funzionali

### 2.1 Explicit Review Scheduler

**RF-SR-001: Algoritmo di Spaziatura Esplicita**
- Utilizzo di una versione modificata di SM-2/Anki per gli intervalli.
- Intervallo iniziale: 24h.
- Fattore di crescita (Ease Factor): Dinamico in base alla performance (1.3x - 2.5x).

### 2.2 Implicit Credit System (The FIRe Logic)

**RF-SR-002: Mapping delle Dipendenze Implicite**
- Ogni argomento $T$ nel Knowledge Graph ha una lista di "competenze sottostanti" $S$.
- Esempio: "Risolvere Equazione II grado" esercita implicitamente "Radice Quadrata", "Proprietà Distributiva", "Sottrazione".

**RF-SR-003: Calcolo del Credito Frazionario**
```typescript
interface ImplicitCredit {
  parentTopic: string;
  childTopic: string;
  creditFactor: number; // 0.1 - 1.0 (quanto il genitore esercita il figlio)
}
```
- Se lo studente risolve correttamente $T$, il sistema aggiunge `creditFactor` al "contatore di stabilità" di $S$, posticipando la prossima revisione esplicita di $S$.

### 2.3 Dynamic Priority Queue

**RF-SR-004: Coda di Revisione Giornaliera**
- Priorità 1: Argomenti in scadenza oggi (probabilità di oblio > 10%).
- Priorità 2: Argomenti falliti precedentemente.
- Priorità 3: Nuovi argomenti (Learning Path).

---

## 3. User Stories

### US-SR-001: Revisione Intelligente
```
COME studente
VOGLIO che il sistema mi proponga di ripassare solo ciò che sto per dimenticare
IN MODO DA non perdere tempo su cose che so già bene
CRITERIO: La coda di revisione non supera mai i 15 minuti al giorno.
```

### US-SR-002: Riconoscimento del Lavoro
```
COME studente
VOGLIO che il sistema sappia che sto già ripassando le basi mentre studio cose difficili
IN MODO DA evitare revisioni ridondanti delle basi
CRITERIO: Gli intervalli degli argomenti base aumentano quando studio argomenti avanzati correlati.
```

---

## 4. Rischi e Mitigazioni

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|-------------|---------|-------------|
| Sovrastima del credito implicito | Media | Alta | Check periodici espliciti (quiz di controllo) |
| Accumulo eccessivo di revisioni | Alta | Media | Cap massimo di revisioni giornaliere, posticipando le meno critiche |

---
*Specifiche per sviluppo - Progetto Math Academy Method*

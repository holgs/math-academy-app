# Specifiche Funzionali: Targeted Remediation System

## 📋 Documento di Specifica (PRD)

**Modulo:** Diagnostic & Remediation Engine
**Versione:** 1.0
**Data:** 2026-01-31

---

## 1. Panoramica

### 1.1 Scopo
Identificare e risolvere istantaneamente le lacune nelle conoscenze fondamentali che impediscono il successo nell'argomento corrente, agendo sulla radice del problema.

### 1.2 Obiettivi
- Analisi dell'errore tramite back-traversal del Knowledge Graph.
- Fornitura di micro-lezioni correttive "Just-in-Time".
- Prevenzione del fallimento ricorrente dovuto a basi deboli.

---

## 2. Requisiti Funzionali

### 2.1 Error Diagnostic Logic

**RF-TR-001: Classificazione Errore**
- Il sistema deve distinguere tra:
  - **Slippage:** Errore casuale/distrazione (richiede solo riprova).
  - **Concept Gap:** Mancata comprensione del tema corrente (richiede ri-spiegazione).
  - **Prerequisite Gap:** Mancata padronanza di un tema base (richiede Remediation).

**RF-TR-002: Recursive Root Cause Analysis**
- Se lo studente fallisce $X$ volte consecutive su un KP, il sistema interroga il Knowledge Graph per identificare il prerequisito più "fragile" (basso score di padronanza).

### 2.2 Remediation Delivery

**RF-TR-003: Interruzione del Flusso (Remediation Queue)**
- Inserimento immediato di una micro-lezione e 3 problemi sul prerequisito identificato.
- Completata la remediation, il sistema riporta lo studente esattamente al punto di interruzione originale.

**RF-TR-004: Warm-up Diagnostico**
- Prima di argomenti critici ("Boss Topics"), il sistema somministra 2 domande sui prerequisiti fondamentali per verificare la prontezza cognitiva.

---

## 3. User Stories

### US-TR-001: La Cura Giusta
```
COME studente
QUANDO non riesco a risolvere un problema difficile perché ho dimenticato una regola base
VOGLIO che il sistema mi faccia ripassare brevemente quella regola
IN MODO DA poter poi completare il problema originale
CRITERIO: Inserimento automatico di task correttivi nel percorso.
```

### US-TR-002: Ritorno al Punto di Partenza
```
COME studente
DOPO aver ripassato la base mancante
VOGLIO tornare subito all'argomento che stavo studiando
IN MODO DA non perdere il filo del discorso
CRITERIO: Salvataggio dello stato della sessione pre-remediation.
```

---

## 4. Rischi e Mitigazioni

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|-------------|---------|-------------|
| Diagnosi errata della lacuna | Media | Media | Monitoraggio dell'efficacia della remediation (se fallisce ancora, scala al prerequisito precedente) |
| Frustrazione da interruzione | Alta | Bassa | Comunicazione chiara: "Facciamo un piccolo ripasso per sbloccarti" |

---
*Specifiche per sviluppo - Progetto Math Academy Method*

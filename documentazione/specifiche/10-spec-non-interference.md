# Specifiche Funzionali: Non-Interference Scheduler

## 📋 Documento di Specifica (PRD)

**Modulo:** Interference Mitigation System
**Versione:** 1.0
**Data:** 2026-01-31

---

## 1. Panoramica

### 1.1 Scopo
Prevenire la confusione cognitiva tra concetti matematici simili attraverso una pianificazione strategica delle lezioni e dei test di discriminazione.

### 1.2 Obiettivi
- Separare nel tempo l'introduzione di concetti morfologicamente simili.
- Garantire la stabilità del primo concetto prima di introdurre il secondo.
- Ridurre l'errore da interferenza proattiva e retroattiva.

---

## 2. Requisiti Funzionali

### 2.1 Conflict Mapping

**RF-NI-001: Tagging dei Conflitti**
- Il Knowledge Graph deve contenere metadati sui "Conflitti di Interferenza".
```typescript
interface InterferencePair {
  topicA: string;
  topicB: string;
  type: 'morphological' | 'procedural' | 'conceptual';
  minDistance: number; // Giorni minimi tra le introduzioni
}
```

### 2.2 Scheduling Constraints

**RF-NI-002: Regola di Stabilità**
- Il sistema non propone `topicB` se la padronanza di `topicA` è inferiore all'85%.

**RF-NI-003: Buffer di Interposizione**
- Tra l'apprendimento di `topicA` e `topicB` devono essere inseriti almeno $N$ argomenti non correlati (default $N=5$).

### 2.3 Discrimination Testing

**RF-NI-004: Esercizi di Contrasto**
- Dopo che entrambi i temi sono stati appresi, il sistema deve generare sessioni di "Interleaving Forzato" (Pilastro 6) specificamente su questi due temi per allenare la discriminazione.

---

## 3. User Stories

### US-NI-001: Evitare la Confusione
```
COME studente
VOGLIO imparare a sommare le frazioni bene prima di imparare a moltiplicarle
IN MODO DA non confondere le due diverse procedure
CRITERIO: Il sistema ritarda l'introduzione della moltiplicazione finché la somma non è automatizzata.
```

### US-NI-002: Saper Scegliere
```
COME studente
VOGLIO che il sistema mi metta alla prova con entrambi i tipi di problemi mescolati
IN MODO DA essere sicuro di saper scegliere la tecnica giusta
CRITERIO: Sessioni di test dedicate alla distinzione tra concetti simili.
```

---

## 4. Rischi e Mitigazioni

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|-------------|---------|-------------|
| Rallentamento eccessivo del percorso | Media | Bassa | Permettere lo studio di altri rami del grafo non in conflitto |
| Mancata identificazione di un conflitto | Bassa | Media | Analisi statistica degli errori comuni per scoprire nuovi pattern di interferenza |

---
*Specifiche per sviluppo - Progetto Math Academy Method*

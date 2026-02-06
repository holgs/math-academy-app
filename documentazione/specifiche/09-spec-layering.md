# Specifiche Funzionali: Layering & Dependency Graph

## 1. Panoramica
Il sistema non deve gestire una lista piatta di argomenti, ma un Grafo Orientato Aclicico (DAG) di dipendenze. Il Layering è implementato strutturalmente tramite le relazioni tra nodi.

## 2. Requisiti Tecnici

### 2.1 Knowledge Graph Data Structure

**RF-LAY-001: DAG Implementation**
Ogni nodo (Knowledge Point) ha relazioni esplicite:
```typescript
interface KnowledgePoint {
  id: string;
  prerequisites: string[]; // ID dei nodi necessari (Layer inferiore)
  postrequisites: string[]; // ID dei nodi che questo abilita
  layerDepth: number; // Distanza dalla radice
}
```

**RF-LAY-002: Implicit Repetition Tracking**
Il sistema deve calcolare quanto un argomento "vecchio" viene esercitato implicitamente.
- Se l'utente risolve un problema del nodo "Equazioni Logaritmiche" (Livello 10).
- E quel nodo ha come prerequisito "Proprietà dei Logaritmi" (Livello 9).
- Allora il sistema registra un "refresh implicito" anche per il Livello 9.
*Algoritmo:* Propagazione del credito di ripasso verso il basso nel grafo (con decadimento).

### 2.2 Content Generation with Layering

**RF-LAY-003: Synthetic Problems**
Il generatore di problemi deve preferire varianti che combinano più skill.
- *Input:* Target Skill (es. Derivate).
- *Modifier:* Include Skill (es. Funzioni Trigonometriche).
- *Output:* Problema "Derivata di sin(x) + cos(x)" invece di "Derivata di x^2".

### 2.3 Diagnostic Remediation

**RF-LAY-004: Root Cause Analysis**
Se l'utente fallisce ripetutamente un nodo di alto livello (Layer N):
- Il sistema non deve solo proporre più esercizi del Layer N.
- Deve testare i prerequisiti (Layer N-1, N-2).
- Se il prerequisito fallisce, il sistema forza una "Remediation" sul livello inferiore prima di riaprire il livello superiore.

## 3. Visualizzazione

**RF-LAY-005: Dependency Map UI**
L'utente deve poter visualizzare la sua posizione nella "Torre della Matematica".
- I nodi bloccati sono in alto.
- I nodi padroneggiati sono le fondamenta in basso.
- Linee di connessione mostrano cosa supporta cosa.

## 4. Configuration

**RF-LAY-006: Layering Density**
Parametro per controllare quanto "carichi" sono i problemi.
- *Low:* Problemi isolati, focus puro sul concetto.
- *High:* Problemi ricchi, che richiedono molteplici abilità precedenti (utile per review e studenti avanzati).

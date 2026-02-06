# Specifiche Funzionali: Retrieval & Testing Engine

## 1. Panoramica
Il sistema deve essere progettato per impedire la fruizione passiva. L'interfaccia predefinita è sempre una domanda/problema, mai una risposta/spiegazione (tranne nel feedback post-tentativo).

## 2. Requisiti Tecnici

### 2.1 Interaction Flow

**RF-RET-001: Blank Slate Interface**
Quando un problema viene presentato:
- Nessun suggerimento visibile.
- Nessuna opzione a scelta multipla (ove possibile, preferire free-input).
- Il campo di input deve avere il focus immediato.

**RF-RET-002: Delayed Feedback**
Il feedback (corretto/sbagliato) e la soluzione completa devono apparire **SOLO** dopo che l'utente ha sottomesso un tentativo completo.
- *Strict Mode:* Impedire la visualizzazione della soluzione se l'input è vuoto o palesemente "spam" (es. "asdf").

### 2.2 Question Types for Retrieval

**RF-RET-003: Free Response Parsing**
Il sistema deve supportare input matematici complessi (LaTeX/MathQuill) per permettere risposte aperte invece di semplici click.
- Validatore simbolico (es. `x+1` è uguale a `1+x`).

**RF-RET-004: Two-Stage Testing**
Per problemi complessi:
1.  **Stage 1 (Retrieval):** "Qual è il primo passo per risolvere questo integrale?" (Scelta multipla o input breve).
2.  **Stage 2 (Execution):** "Ora risolvi l'integrale completo".
*Obiettivo:* Forzare il recupero della strategia prima dell'esecuzione meccanica.

### 2.3 Hint Management (Anti-Peeking)

**RF-RET-005: Progressive Hints con Penalità**
Gli aiuti (hints) non devono essere gratuiti.
- Livello 1: Suggerimento vago (piccolo costo score).
- Livello 2: Primo passaggio (medio costo score).
- Livello 3: Soluzione (fallimento prova).
*Logica:* L'utente è incentivato a sforzarsi di recuperare l'informazione da solo per massimizzare il punteggio.

### 2.4 Session Structure

**RF-RET-006: Pre-Session Warmup**
Ogni nuova sessione di apprendimento inizia con 3-5 domande di "Retrieval" sugli argomenti del giorno precedente.

## 3. Analytics

**RF-RET-007: Retention Index**
Misurare la correlazione tra "Sforzo nel Retrieval" (tempo di risposta, assenza di hint) e "Ritenzione a lungo termine".
- Utenti che usano meno hint dovrebbero avere curve di dimenticanza più lente.

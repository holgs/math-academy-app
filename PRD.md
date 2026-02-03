Ecco il **Product Requirements Document (PRD)** completo e consolidato in un unico oggetto. Questo documento include tutte le modifiche discusse: il modello "Blended" (lezione frontale + esercitazione a casa autonoma), l'uso rigoroso del grafo della conoscenza basato sul tuo schema JSON e l'integrazione con l'LLM.

---

# PRODUCT REQUIREMENTS DOCUMENT (PRD)

## Progetto: MathFlow Blended (Titolo di Lavoro)

**Versione:** 2.1
**Data:** 03 Febbraio 2026
**Stato:** Draft per Sviluppo

---

## 1. Executive Summary

**MathFlow Blended** è una piattaforma didattica per la matematica che combina l'efficacia dell'istruzione diretta in classe con la potenza dell'apprendimento adattivo personalizzato a casa.
Il sistema permette al docente di pianificare un intero anno scolastico basandosi su un **Grafo della Conoscenza (DAG)** granulare. L'AI (LLM) genera automaticamente i supporti visivi per la lezione frontale (LIM) e, parallelamente, pacchetti di esercizi gamificati che gli studenti svolgono a casa sui propri dispositivi.

**Problema Risolto:**

* Colma il divario tra i tempi rigidi della lezione scolastica e i tempi individuali di apprendimento.
* Elimina la necessità di hardware costoso (tablet) per ogni studente in classe.
* Automatizza la creazione di materiale didattico di alta qualità e coerente.

---

## 2. Utenti e Personas

### 2.1 Il Docente (The Conductor)

* **Obiettivo:** Pianificare il programma, spiegare concetti complessi alla LIM, monitorare chi rimane indietro.
* **Pain Point:** Tempo eccessivo per creare slide ed esercizi differenziati; difficoltà nel tracciare le lacune pregresse.
* **Interazione:** Desktop (Pianificazione) e LIM (Erogazione).

### 2.2 Lo Studente (The Player)

* **Obiettivo:** Capire la lezione, esercitarsi senza frustrazione, ricevere gratificazione immediata (Gamification).
* **Pain Point:** Noia, paura di sbagliare, esercizi a casa troppo difficili senza aiuto.
* **Interazione:** Smartphone/PC (A casa).

---

## 3. Core Principles & Metodologia

Il sistema si basa rigidamente sui principi del documento "The Math Academy Way", adattati al contesto italiano:

1. **Granularità Atomica:** Ogni lezione copre concetti minimi specifici (Knowledge Points - KP).
2. **Grafo delle Dipendenze:** Nessun argomento viene proposto se i prerequisiti non sono "Mastered".
3. **Spaced Repetition:** Il software a casa ripropone vecchi concetti appena prima che vengano dimenticati.
4. **Interference Management:** Il sistema gestisce attivamente i concetti simili che generano confusione (es. Area vs Perimetro) grazie ai campi `interference_links` dello schema.

---

## 4. User Journey e Flussi Funzionali

### FASE A: Pianificazione (Docente - Una Tantum)

1. **Input:** Il docente seleziona il macro-argomento (es. "Algebra 1") e il monte ore totale disponibile (es. 50 ore).
2. **Mapping:** Il sistema consulta il DB (Knowledge Graph), recupera i nodi necessari e li distribuisce nel calendario, rispettando le dipendenze.
3. **Output:** Un piano lezioni modificabile (es. Lezione 1: "Monomi simili", Lezione 2: "Somma algebrica").

### FASE B: Generazione Contenuti (AI Backend - Pre-Lezione)

Quando il docente conferma una lezione, l'LLM (orchestrato dal sistema) genera due artefatti distinti:

1. **Il "Deck LIM":** Slide visive per la spiegazione frontale. Include definizioni, esempi animati passo-passo e problemi da risolvere collettivamente alla lavagna.
2. **Il "Mission Pack" (JSON):** Una batteria di esercizi per l'app studente. Include:
* Esercizi sul nuovo argomento.
* Esercizi di ripasso (calcolati dall'algoritmo di Spaced Repetition).
* Spiegazioni di recupero (hint) in caso di errore.



### FASE C: La Lezione in Classe (Sincrona - Solo Docente)

* **Modalità Presentazione:** Interfaccia pulita, alto contrasto.
* **Step-by-Step Reveal:** Il docente controlla il flusso. Le soluzioni non appaiono subito, permettendo il ragionamento di classe.
* **Annotazioni:** Se la LIM è touch, il docente può scrivere sopra le slide generate.
* **Nessun Login Studente:** In questa fase gli studenti ascoltano e partecipano analogicamente (quaderno/lavagna).

### FASE D: Studio a Casa (Asincrono - Studente)

1. **Accesso:** Lo studente apre l'app/web.
2. **Dashboard Gamificata:** Vede la "Missione del Giorno", XP correnti, Livello, Classifica.
3. **Esecuzione:** Svolge gli esercizi.
* **Successo:** Guadagna monete/XP. Il nodo diventa "Mastered".
* **Errore:** L'AI fornisce un feedback specifico. Se l'errore persiste, l'app scala la difficoltà o rimanda a un prerequisito.


4. **Anti-Cheating (Opzionale):** L'algoritmo varia i dati numerici degli esercizi per ogni studente.

### FASE E: Feedback Loop (Docente)

Il giorno successivo, la Dashboard Docente mostra:

* Argomenti compresi vs Argomenti ostici (es. "Il 40% ha sbagliato i segni").
* Suggerimenti AI: "Consigliato ripasso rapido di 5 min sui segni prima della nuova lezione".

---

## 5. Specifiche Tecniche e Dati

### 5.1 Knowledge Graph (Schema JSON)

Il database deve essere popolato seguendo rigorosamente lo schema fornito.

* **Entità:** `KnowledgePoint`
* **Campi Chiave:**
* `id`: Identificativo univoco (es. `math.alg.01`).
* `prerequisites`: Array di ID bloccanti.
* `interference_links`: Array di oggetti `{topicId, reason}` per gestire la confusione cognitiva.
* `layer`: Intero per visualizzazione a cipolla.



### 5.2 Architettura AI (LLM)

* **Ruolo:** Content Generator (non Curriculum Designer). La struttura è data dal Grafo, l'LLM riempie solo il testo/LaTeX.
* **Prompt Engineering:** I prompt devono includere il JSON del nodo specifico per evitare allucinazioni.
* **Validazione:** Ogni output dell'LLM (esercizi) deve essere parsabile in JSON strutturato per l'app.

### 5.3 Gamification Engine

* **XP (Punti Esperienza):** Misurano la progressione didattica.
* **Coins (Monete):** Valuta spendibile (es. per sbloccare avatar o temi grafici dell'app).
* **Leaderboard:** Classifiche settimanali (resettate per mantenere la motivazione).
* **Streak:** Bonus per chi si esercita ogni giorno.

---

## 6. Roadmap MVP (Minimum Viable Product)

### Sprint 1: Data & Core

* Implementazione Database (PostgreSQL/Mongo) con lo schema `KnowledgePoint`.
* Popolamento del Grafo per 1 Macro-Argomento (es. "Equazioni Lineari") usando l'LLM come assistente data-entry.

### Sprint 2: Teacher Tool & GenAI

* Interfaccia Docente: Selezione argomento e visualizzazione calendario.
* Pipeline LLM: Generazione del "Deck LIM" (HTML/React reveal).

### Sprint 3: Student App (Web)

* Interfaccia Mobile-First per gli studenti.
* Motore di esecuzione esercizi (Input numerico/scelta multipla).
* Sistema base di Login e assegnazione punteggi.

---

## 7. Appendice: Schema del Grafo


> ```json
> {
>   "type": "object",
>   "required": ["id", "title", "description", "prerequisites", "layer"],
>   "properties": {
>     "id": { "type": "string" },
>     "title": { "type": "string" },
>     "description": { "type": "string" },
>     "layer": { "type": "integer" },
>     "prerequisites": { "type": "array", "items": { "type": "string" } },
>     "interference_links": {
>       "type": "array",
>       "items": {
>         "type": "object",
>         "properties": {
>           "topicId": { "type": "string" },
>           "reason": { "type": "string" }
>         }
>       }
>     },
>     "encompassed_skills": {
>       "type": "array",
>       "items": { "type": "object", "properties": { "skill_description": { "type": "string" } } }
>     }
>   }
> }
> 
> ```
> 
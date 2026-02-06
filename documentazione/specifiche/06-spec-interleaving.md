# Specifiche Funzionali: Interleaving Engine

## 1. Panoramica
Il sistema deve garantire che, dopo la fase iniziale di acquisizione, nessun argomento venga praticato in isolamento. La generazione delle sessioni di review deve essere stocastica e mista.

## 2. Requisiti Tecnici

### 2.1 Problem Selection Algorithm

**RF-INT-001: Shuffle Logic**
Il generatore della sessione di review deve selezionare `N` problemi dal pool dei `Due Topics` (argomenti in scadenza di revisione).
```python
def generate_review_session(user_id, n_problems):
    due_topics = get_due_topics(user_id)
    # Evita clustering dello stesso topic
    session_problems = []
    last_topic = None
    
    while len(session_problems) < n_problems and due_topics:
        topic = select_weighted_random(due_topics)
        if topic == last_topic and len(due_topics) > 1:
            continue # Riprova per evitare AA
            
        problem = topic.generate_problem()
        session_problems.append(problem)
        last_topic = topic
        
    return session_problems
```

**RF-INT-002: Similarity Clustering**
Il sistema deve favorire l'interleaving di argomenti "confondibili" (es. `sin(x)` e `cos(x)`, o `permutazioni` e `combinazioni`) nella stessa sessione per allenare la discriminazione.
- Attributo `confusion_group_id` nel database dei Topic.
- Se viene selezionato un topic con `confusion_group_id X`, aumentare la probabilità di selezionare altri topic con lo stesso ID.

### 2.2 User Interface

**RF-INT-003: Blind Context**
Durante la risoluzione del problema nella sessione di review, l'interfaccia **NON** deve mostrare:
- Il titolo del capitolo o dell'argomento.
- Il tag del tipo di problema (es. "Geometria").
*Rationale:* Lo studente deve dedurre il contesto dal testo del problema stesso.

### 2.3 Analytics

**RF-INT-004: Discrimination Tracking**
Tracciare gli errori di "Errata Strategia" vs "Errore di Calcolo".
Se l'utente applica la formula dell'area al posto del perimetro:
- Loggare `error_type: strategy_mismatch`
- Aumentare la frequenza di interleaving tra questi due specifici concetti.

## 3. Configurazione

| Parametro | Valore Default | Descrizione |
|-----------|----------------|-------------|
| `max_consecutive_same_topic` | 1 | Max problemi dello stesso tipo di fila |
| `interleaving_intensity` | High | Grado di mescolamento tra capitoli distanti |
| `confusion_pairing` | Enabled | Forzare accoppiamento argomenti simili |

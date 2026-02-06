# Specifiche Funzionali: Automaticity Drills

## 1. Panoramica
Il sistema deve includere modalità specifiche (Drills) focalizzate sulla velocità di esecuzione, distinguendo tra "Padronanza Concettuale" (accuratezza) e "Automaticità" (velocità).

## 2. Requisiti Tecnici

### 2.1 Latency Tracking

**RF-AUTO-001: Misurazione Tempo di Risposta**
Il sistema deve misurare il tempo `T` intercorso tra:
- `t0`: rendering completo del problema a video.
- `t1`: invio della risposta corretta.

**RF-AUTO-002: Soglie di Automaticità**
Ogni Knowledge Point (KP) deve avere un metadato `target_latency_sec`.
Esempio:
- Tabelline: 2.0s
- Fattorizzazione semplice: 5.0s
- Derivata polinomiale: 8.0s

### 2.2 Drill Mode Logic

**RF-AUTO-003: Speed Drills**
Sessioni speciali dove:
- L'interfaccia mostra un timer (opzionale, countdown o countup).
- Se `t_response > target_latency`, il problema è considerato "Non Automatico" (anche se corretto).
- Feedback visivo immediato sulla velocità (es. icona "Tartaruga" vs "Lepre").

**RF-AUTO-004: Gamification della Velocità**
- Classifiche basate su "Problemi al minuto" (PPM).
- Badge per "Streak di velocità" (es. 10 risposte consecutive sotto i 3s).

### 2.3 Progressione Bloccata da Velocità

**RF-AUTO-005: Gating Criteria**
In alcuni punti critici del curriculum, l'avanzamento è bloccato non solo dall'accuratezza ma dalla velocità.
*Regola:* Non sbloccare "Moltiplicazioni a più cifre" finché "Tabelline 1-9" non hanno latenza media < 2.5s.

### 2.4 Interface Design

**RF-AUTO-006: Input Ottimizzato**
Per i drill di velocità, l'input non deve essere il collo di bottiglia.
- Supporto input numerico rapido da tastiera.
- Auto-submit opzionale (se la risposta è 1 cifra o lunghezza fissa).
- Nessuna animazione di transizione lenta tra le domande (< 100ms).

## 3. Data Model Update

```typescript
interface UserMastery {
  topicId: string;
  accuracyLevel: number; // 0-1.0
  averageLatencyMs: number;
  isAutomatic: boolean; // true se accuracy > 0.95 AND latency < target
  lastSpeedDrillDate: Date;
}
```

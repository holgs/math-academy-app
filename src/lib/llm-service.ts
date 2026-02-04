import OpenAI from 'openai';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

export type LLMProvider = 'openai' | 'google' | 'glm';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model?: string;
}

// Default models for each provider
const DEFAULT_MODELS: Record<LLMProvider, string> = {
  openai: 'gpt-4o-mini',
  google: 'gemini-2.0-flash-exp',
  glm: 'glm-4.7',
};

// Structure for exercise generation
export interface ExerciseTemplate {
  question: string;
  answer: string;
  hint: string;
  difficulty: 1 | 2 | 3 | 4;
  type: 'multiple_choice' | 'open' | 'step_by_step';
  options?: string[]; // for multiple choice
  explanation: string;
  pillarReference?: string; // references the 12 pillars
}

// 12 Pillars of the Method
export const TWELVE_PILLARS = [
  { id: 'visualization', name: 'Visualizzazione', description: 'Rappresenta il problema graficamente' },
  { id: 'decomposition', name: 'Scomposizione', description: 'Dividi il problema in sottoproblemi' },
  { id: 'analogy', name: 'Analogia', description: 'Trova un problema simile già risolto' },
  { id: 'pattern', name: 'Pattern Recognition', description: 'Identifica schemi ricorrenti' },
  { id: 'estimation', name: 'Stima', description: 'Fai una stima approssimativa' },
  { id: 'verification', name: 'Verifica', description: 'Controlla la risposta' },
  { id: 'simplification', name: 'Semplificazione', description: 'Riduci la complessità' },
  { id: 'generalization', name: 'Generalizzazione', description: 'Estendi a casi più ampi' },
  { id: 'abstraction', name: 'Astrazione', description: 'Trova la struttura essenziale' },
  { id: 'reverse', name: 'Reverse Engineering', description: 'Parti dalla soluzione' },
  { id: 'constraints', name: 'Vincoli', description: 'Analizza i limiti del problema' },
  { id: 'creativity', name: 'Creatività', description: 'Pensa fuori dagli schemi' },
] as const;

export interface KnowledgePointContext {
  id: string;
  title: string;
  description: string;
  layer: number;
  prerequisites: string[];
  commonMistakes: string[];
  realWorldApplications: string[];
  tips: string[];
}

class LLMService {
  private configs: Map<LLMProvider, LLMConfig> = new Map();
  private openaiClient: OpenAI | null = null;
  private googleClient: GoogleGenerativeAI | null = null;
  private googleModel: GenerativeModel | null = null;

  setConfig(config: LLMConfig) {
    this.configs.set(config.provider, config);
    
    if (config.provider === 'openai') {
      this.openaiClient = new OpenAI({ apiKey: config.apiKey });
    } else if (config.provider === 'google') {
      this.googleClient = new GoogleGenerativeAI(config.apiKey);
      this.googleModel = this.googleClient.getGenerativeModel({ 
        model: config.model || DEFAULT_MODELS.google 
      });
    }
  }

  isConfigured(provider: LLMProvider): boolean {
    return this.configs.has(provider);
  }

  getConfig(provider: LLMProvider): LLMConfig | undefined {
    return this.configs.get(provider);
  }

  async generateExercise(
    knowledgePoint: KnowledgePointContext, 
    provider: LLMProvider,
    difficulty: 1 | 2 | 3 | 4 = 2
  ): Promise<ExerciseTemplate> {
    const config = this.configs.get(provider);
    if (!config) {
      throw new Error(`Provider ${provider} not configured`);
    }

    const prompt = this.buildExercisePrompt(knowledgePoint, difficulty);

    switch (provider) {
      case 'openai':
        return this.generateWithOpenAI(prompt, config);
      case 'google':
        return this.generateWithGoogle(prompt);
      case 'glm':
        return this.generateWithGLM(prompt, config);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  private buildExercisePrompt(kp: KnowledgePointContext, difficulty: number): string {
    const difficultyLabels = ['Base', 'Intermedio', 'Avanzato', 'Esperto'];
    
    return `Genera un esercizio di matematica per il seguente concetto:

CONCETTO: ${kp.title}
DESCRIZIONE: ${kp.description}
LIVELLO: Layer ${kp.layer}
DIFFICOLTÀ: ${difficultyLabels[difficulty - 1]} (${difficulty}/4)

PREREQUISITI: ${kp.prerequisites.join(', ') || 'Nessuno'}

Requisiti dell'esercizio:
1. Deve essere coerente con il concetto e il livello
2. Deve rispettare la difficoltà richiesta
3. Deve includere un suggerimento che faccia riferimento ai 12 Pilastri del Metodo
4. Deve avere una spiegazione dettagliata della soluzione

I 12 Pilastri del Metodo sono:
1. Visualizzazione - Rappresenta il problema graficamente
2. Scomposizione - Dividi in sottoproblemi
3. Analogia - Trova problemi simili
4. Pattern Recognition - Identifica schemi
5. Stima - Fai una stima approssimativa
6. Verifica - Controlla la risposta
7. Semplificazione - Riduci la complessità
8. Generalizzazione - Estendi a casi più ampi
9. Astrazione - Trova la struttura essenziale
10. Reverse Engineering - Parti dalla soluzione
11. Vincoli - Analizza i limiti
12. Creatività - Pensa fuori dagli schemi

Restituisci SOLO un oggetto JSON in questo formato esatto:
{
  "question": "Testo della domanda/esercizio",
  "answer": "Risposta corretta",
  "hint": "Suggerimento che cita uno dei 12 pilastri",
  "difficulty": ${difficulty},
  "type": "multiple_choice|open|step_by_step",
  "options": ["opzione1", "opzione2", "opzione3", "opzione4"], // solo per multiple_choice
  "explanation": "Spiegazione dettagliata passo dopo passo",
  "pillarReference": "id_del_pilastro_usato_nel_suggerimento"
}

Genera l'esercizio ora:`;
  }

  private async generateWithOpenAI(prompt: string, config: LLMConfig): Promise<ExerciseTemplate> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const response = await this.openaiClient.chat.completions.create({
      model: config.model || DEFAULT_MODELS.openai,
      messages: [
        { role: 'system', content: 'Sei un generatore di esercizi matematici per studenti. Rispondi sempre in italiano con JSON valido.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    return this.parseExerciseResponse(content);
  }

  private async generateWithGoogle(prompt: string): Promise<ExerciseTemplate> {
    if (!this.googleModel) {
      throw new Error('Google client not initialized');
    }

    const result = await this.googleModel.generateContent(prompt);
    const text = result.response.text();
    return this.parseExerciseResponse(text);
  }

  private async generateWithGLM(prompt: string, config: LLMConfig): Promise<ExerciseTemplate> {
    const response = await fetch('https://api.z.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || DEFAULT_MODELS.glm,
        messages: [
          { role: 'system', content: 'Sei un generatore di esercizi matematici. Rispondi in italiano con JSON valido.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`GLM API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from GLM');
    }

    return this.parseExerciseResponse(content);
  }

  private parseExerciseResponse(text: string): ExerciseTemplate {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      question: parsed.question,
      answer: parsed.answer,
      hint: parsed.hint,
      difficulty: parsed.difficulty || 2,
      type: parsed.type || 'open',
      options: parsed.options,
      explanation: parsed.explanation,
      pillarReference: parsed.pillarReference,
    };
  }

  // Generate context/lampadine for a knowledge point
  async generateKnowledgeContext(
    kp: { id: string; title: string; description: string },
    provider: LLMProvider
  ): Promise<{ tips: string[]; commonMistakes: string[]; realWorldApps: string[] }> {
    const config = this.configs.get(provider);
    if (!config) {
      throw new Error(`Provider ${provider} not configured`);
    }

    const prompt = `Per il concetto matematico "${kp.title}" (${kp.description}), genera:

1. 3-5 suggerimenti pratici (tips) per impararlo meglio
2. 2-3 errori comuni che fanno gli studenti
3. 2-3 applicazioni nel mondo reale

Restituisci SOLO JSON:
{
  "tips": ["suggerimento1", "suggerimento2", ...],
  "commonMistakes": ["errore1", "errore2", ...],
  "realWorldApps": ["applicazione1", "applicazione2", ...]
}`;

    let content: string;
    
    if (provider === 'openai') {
      const response = await this.openaiClient!.chat.completions.create({
        model: config.model || DEFAULT_MODELS.openai,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      });
      content = response.choices[0]?.message?.content || '';
    } else if (provider === 'google') {
      const result = await this.googleModel!.generateContent(prompt);
      content = result.response.text();
    } else {
      const response = await fetch('https://api.z.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model || DEFAULT_MODELS.glm,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await response.json();
      content = data.choices?.[0]?.message?.content || '';
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    return JSON.parse(jsonMatch[0]);
  }
}

export const llmService = new LLMService();

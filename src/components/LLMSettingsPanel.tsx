'use client';

import { useState, useEffect } from 'react';
import { LLMProvider, llmService, TWELVE_PILLARS } from '@/lib/llm-service';
import { Key, Check, X, Sparkles, Bot, Brain, Zap, Lightbulb } from 'lucide-react';

interface LLMSettings {
  openai?: { apiKey: string; model: string };
  google?: { apiKey: string; model: string };
  glm?: { apiKey: string; model: string };
}

interface LLMSettingsPanelProps {
  onClose: () => void;
  onConfigured: () => void;
}

const PROVIDER_INFO: Record<LLMProvider, { name: string; icon: React.ElementType; color: string; models: string[] }> = {
  openai: {
    name: 'OpenAI',
    icon: Bot,
    color: 'text-green-600',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo']
  },
  google: {
    name: 'Google Gemini',
    icon: Brain,
    color: 'text-blue-600',
    models: ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash']
  },
  glm: {
    name: 'GLM (Z.AI)',
    icon: Zap,
    color: 'text-purple-600',
    models: ['glm-4.7', 'glm-4']
  }
};

export default function LLMSettingsPanel({ onClose, onConfigured }: LLMSettingsPanelProps) {
  const [settings, setSettings] = useState<LLMSettings>({});
  const [activeProvider, setActiveProvider] = useState<LLMProvider>('google');
  const [tempKey, setTempKey] = useState('');
  const [tempModel, setTempModel] = useState('');
  const [showPillars, setShowPillars] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('mathacademy_llm_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSettings(parsed);
      
      Object.entries(parsed).forEach(([provider, config]: [string, any]) => {
        llmService.setConfig({
          provider: provider as LLMProvider,
          apiKey: config.apiKey,
          model: config.model
        });
      });
    }
  }, []);

  const handleSave = () => {
    if (!tempKey.trim()) return;

    const newSettings = {
      ...settings,
      [activeProvider]: {
        apiKey: tempKey.trim(),
        model: tempModel || PROVIDER_INFO[activeProvider].models[0]
      }
    };

    setSettings(newSettings);
    localStorage.setItem('mathacademy_llm_settings', JSON.stringify(newSettings));

    llmService.setConfig({
      provider: activeProvider,
      apiKey: tempKey.trim(),
      model: tempModel || PROVIDER_INFO[activeProvider].models[0]
    });

    setTempKey('');
    onConfigured();
  };

  const handleClear = (provider: LLMProvider) => {
    const newSettings = { ...settings };
    delete newSettings[provider];
    setSettings(newSettings);
    localStorage.setItem('mathacademy_llm_settings', JSON.stringify(newSettings));
  };

  const isProviderConfigured = (provider: LLMProvider) => {
    return !!settings[provider]?.apiKey;
  };

  return (
    <div className="w-full max-w-3xl bg-white p-6 rounded-xl shadow-lg border border-gray-200 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Key className="text-blue-600" size={20} />
          <h2 className="text-lg font-semibold text-gray-900">Configurazione AI</h2>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {(Object.keys(PROVIDER_INFO) as LLMProvider[]).map((provider) => {
          const info = PROVIDER_INFO[provider];
          const Icon = info.icon;
          const isConfigured = isProviderConfigured(provider);
          
          return (
            <button
              key={provider}
              onClick={() => {
                setActiveProvider(provider);
                setTempModel(settings[provider]?.model || info.models[0]);
              }}
              className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                activeProvider === provider
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="relative">
                <Icon className={info.color} size={24} />
                {isConfigured && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                )}
              </div>
              <span className="text-sm font-medium text-gray-700">{info.name}</span>
            </button>
          );
        })}
      </div>

      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          {PROVIDER_INFO[activeProvider].name} Settings
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">API Key</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                placeholder={`Inserisci API key...`}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {isProviderConfigured(activeProvider) && (
                <button
                  onClick={() => handleClear(activeProvider)}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium"
                >
                  Rimuovi
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Modello</label>
            <select
              value={tempModel || settings[activeProvider]?.model || PROVIDER_INFO[activeProvider].models[0]}
              onChange={(e) => setTempModel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {PROVIDER_INFO[activeProvider].models.map((model) => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSave}
            disabled={!tempKey.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Check size={18} />
            Salva Configurazione
          </button>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <button
          onClick={() => setShowPillars(!showPillars)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-blue-600"
        >
          <Lightbulb size={16} className="text-yellow-500" />
          {showPillars ? 'Nascondi' : 'Mostra'} i 12 Pilastri del Metodo
        </button>

        {showPillars && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
            {TWELVE_PILLARS.map((pillar) => (
              <div key={pillar.id} className="bg-yellow-50 p-2 rounded-lg border border-yellow-200">
                <div className="font-medium text-xs text-gray-800">{pillar.name}</div>
                <div className="text-[10px] text-gray-500">{pillar.description}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(Object.keys(PROVIDER_INFO) as LLMProvider[]).map((provider) => {
          const isConfigured = isProviderConfigured(provider);
          return (
            <div
              key={provider}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                isConfigured
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {isConfigured ? <Check size={12} /> : <X size={12} />}
              {PROVIDER_INFO[provider].name}
            </div>
          );
        })}
      </div>
    </div>
  );
}

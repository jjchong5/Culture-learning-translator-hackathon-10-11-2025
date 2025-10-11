// Legacy types for backward compatibility with old API
export interface Translation {
  _id?: string;
  originalText: string;
  translatedText: string;
  sourceCulture: string;
  targetCulture: string;
  context?: string;
  timestamp: Date;
}

export interface LegacyTranslationRequest {
  text: string;
  sourceCulture: string;
  targetCulture: string;
  context?: string;
}

export interface LegacyTranslationResponse {
  success: boolean;
  translatedText?: string;
  error?: string;
}

// User Memory Interface
export interface UserMemory {
  userId: string;
  preferences: {
    [languagePair: string]: {
      formality: number; // 0-1 scale
      directness: number; // 0-1 scale
      interactionCount: number;
      lastUpdated: Date;
    };
  };
  evolution: Array<{
    timestamp: Date;
    formality: number;
    directness: number;
  }>;
  feedbackStats?: {
    consecutiveNegative: number;
    totalPositive: number;
    totalNegative: number;
    lastFeedbackTimestamp: Date;
  };
}

// Translation Request Interface (new agent-based API)
export interface TranslationRequest {
  text: string;
  targetLang: string;
  userId: string;
}

// Translation Response Interface (new agent-based API)
export interface TranslationResponse {
  translation: string;
  reasoning: string[];
  confidence: number;
  memoryUsed: boolean;
}

// Agent Log Interface
export interface AgentLog {
  userId: string;
  timestamp: Date;
  originalText: string;
  translation: string;
  reasoning: string[];
  confidence: number;
  feedback?: 'positive' | 'negative';
}

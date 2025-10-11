'use client';

import { useState, useEffect } from 'react';
import { TranslationResponse } from '@/lib/types';

// Language options
const LANGUAGES = [
  { code: 'Spanish', label: 'Spanish 🇪🇸' },
  { code: 'Japanese', label: 'Japanese 🇯🇵' },
  { code: 'French', label: 'French 🇫🇷' },
  { code: 'German', label: 'German 🇩🇪' },
  { code: 'Chinese', label: 'Chinese 🇨🇳' },
  { code: 'Korean', label: 'Korean 🇰🇷' },
];

// Reasoning step interface
interface ReasoningStep {
  icon: string;
  label: string;
  text: string;
  isComplete: boolean;
  isActive: boolean;
}

// Context detection result
interface DetectedContext {
  type: 'business' | 'casual' | 'technical' | null;
  suggestedTone: string;
  confidence: number;
}

// Memory suggestion
interface MemorySuggestion {
  formality: number;
  language: string;
}

export default function TranslationInterface() {
  // State management
  const [inputText, setInputText] = useState('');
  const [targetLang, setTargetLang] = useState('Spanish');
  const [translation, setTranslation] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [memoryUsed, setMemoryUsed] = useState(false);
  const [reasoningSteps, setReasoningSteps] = useState<ReasoningStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [messageId, setMessageId] = useState('');
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Proactive suggestion states
  const [detectedContext, setDetectedContext] = useState<DetectedContext | null>(null);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [memorySuggestion, setMemorySuggestion] = useState<MemorySuggestion | null>(null);
  const [showMemorySuggestion, setShowMemorySuggestion] = useState(false);
  const [showLowConfidenceWarning, setShowLowConfidenceWarning] = useState(false);
  const [lowConfidenceReason, setLowConfidenceReason] = useState('');
  const [suggestedPreferences, setSuggestedPreferences] = useState<{ formality: number; context: string } | null>(null);

  // Character count
  const charCount = inputText.length;
  const maxChars = 1000;

  // Initialize reasoning steps
  const initReasoningSteps = (): ReasoningStep[] => [
    { icon: '🔍', label: 'ANALYZING...', text: '', isComplete: false, isActive: false },
    { icon: '🧠', label: 'REMEMBERING...', text: '', isComplete: false, isActive: false },
    { icon: '🌍', label: 'ADAPTING...', text: '', isComplete: false, isActive: false },
    { icon: '✅', label: 'COMPLETE!', text: '', isComplete: false, isActive: false },
  ];

  // Detect context from input text
  const detectContext = (text: string): DetectedContext | null => {
    if (text.length < 20) return null;

    const lowerText = text.toLowerCase();

    // Business context keywords
    const businessKeywords = ['meeting', 'email', 'report', 'presentation', 'proposal', 'contract', 'deadline', 'professional', 'client', 'business'];
    const businessMatches = businessKeywords.filter(keyword => lowerText.includes(keyword)).length;

    // Casual context keywords
    const casualKeywords = ['thanks', 'hey', 'lol', 'yeah', 'cool', 'awesome', 'buddy', 'friend', 'hang out', 'btw'];
    const casualMatches = casualKeywords.filter(keyword => lowerText.includes(keyword)).length;

    // Technical context keywords
    const technicalKeywords = ['bug', 'api', 'function', 'code', 'error', 'database', 'server', 'algorithm', 'debug', 'implement'];
    const technicalMatches = technicalKeywords.filter(keyword => lowerText.includes(keyword)).length;

    // Determine the context with highest matches
    const maxMatches = Math.max(businessMatches, casualMatches, technicalMatches);

    if (maxMatches === 0) return null;

    if (businessMatches === maxMatches && businessMatches >= 1) {
      return {
        type: 'business',
        suggestedTone: 'formal',
        confidence: Math.min(businessMatches * 0.3, 0.9),
      };
    } else if (casualMatches === maxMatches && casualMatches >= 1) {
      return {
        type: 'casual',
        suggestedTone: 'informal',
        confidence: Math.min(casualMatches * 0.3, 0.9),
      };
    } else if (technicalMatches === maxMatches && technicalMatches >= 1) {
      return {
        type: 'technical',
        suggestedTone: 'neutral but precise',
        confidence: Math.min(technicalMatches * 0.3, 0.9),
      };
    }

    return null;
  };

  // Effect to detect context as user types
  useEffect(() => {
    if (inputText.length >= 20) {
      const context = detectContext(inputText);
      setDetectedContext(context);
      setShowSuggestion(context !== null);
    } else {
      setDetectedContext(null);
      setShowSuggestion(false);
    }
  }, [inputText]);

  // Fetch memory suggestions for target language
  useEffect(() => {
    const fetchMemorySuggestion = async () => {
      if (!targetLang) return;

      try {
        const response = await fetch(`/api/memory?userId=demo-user&language=${targetLang}`);
        if (response.ok) {
          const data = await response.json();
          if (data.memory) {
            setMemorySuggestion({
              formality: data.memory.preferences?.formality || 0.7,
              language: targetLang,
            });
            setShowMemorySuggestion(true);
          } else {
            setMemorySuggestion(null);
            setShowMemorySuggestion(false);
          }
        }
      } catch (err) {
        console.error('Failed to fetch memory suggestion:', err);
      }
    };

    fetchMemorySuggestion();
  }, [targetLang]);

  // Apply suggested preferences
  const applySuggestedPreferences = () => {
    if (detectedContext && detectedContext.type) {
      // Store the suggested preferences to be sent with translation
      let formalityLevel = 0.5;
      if (detectedContext.type === 'business') formalityLevel = 0.9;
      else if (detectedContext.type === 'casual') formalityLevel = 0.3;
      else if (detectedContext.type === 'technical') formalityLevel = 0.7;

      setSuggestedPreferences({
        formality: formalityLevel,
        context: detectedContext.type,
      });

      setShowSuggestion(false);
      showToastMessage(`Applied ${detectedContext.suggestedTone} tone preference`);
    }
  };

  // Dismiss suggestion
  const dismissSuggestion = () => {
    setShowSuggestion(false);
  };

  // Handle translation
  const handleTranslate = async () => {
    if (!inputText.trim()) {
      setError('Please enter text to translate');
      return;
    }

    if (charCount > maxChars) {
      setError(`Text exceeds maximum length of ${maxChars} characters`);
      return;
    }

    // Reset state
    setLoading(true);
    setError('');
    setTranslation('');
    setReasoningSteps(initReasoningSteps());
    setFeedbackGiven(false);
    setMessageId('');
    setShowLowConfidenceWarning(false);

    try {
      // Call agent-translate API with suggested preferences if available
      const requestBody: {
        text: string;
        targetLang: string;
        userId: string;
        preferences?: { formality: number; context: string };
      } = {
        text: inputText,
        targetLang,
        userId: 'demo-user', // In production, get from auth
      };

      // Include suggested preferences if user accepted them
      if (suggestedPreferences) {
        requestBody.preferences = suggestedPreferences;
      }

      const response = await fetch('/api/agent-translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data: TranslationResponse & { error?: string } = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Translation failed');
      }

      // Set translation data
      setTranslation(data.translation);
      setConfidence(data.confidence);
      setMemoryUsed(data.memoryUsed);

      // Check for low confidence and show warning
      if (data.confidence < 0.60) {
        setShowLowConfidenceWarning(true);
        setLowConfidenceReason(
          data.reasoning && data.reasoning.length > 0
            ? data.reasoning[0]
            : 'The input text may be ambiguous or complex'
        );
      }

      // Animate reasoning steps
      const steps = initReasoningSteps();

      // Map API reasoning to steps
      if (data.reasoning && data.reasoning.length >= 3) {
        steps[0].text = data.reasoning[0]; // Analysis
        steps[1].text = data.reasoning[1]; // Memory
        steps[2].text = data.reasoning[2]; // Translation
        steps[3].text = 'Translation ready!';
      }

      // Animate steps sequentially
      animateReasoningSteps(steps);

    } catch (err) {
      console.error('Translation error:', err);
      setError(err instanceof Error ? err.message : 'Translation failed');
    } finally {
      setLoading(false);
    }
  };

  // Animate reasoning steps with staggered timing
  const animateReasoningSteps = (steps: ReasoningStep[]) => {
    steps.forEach((step, index) => {
      setTimeout(() => {
        setReasoningSteps(prev => {
          const updated = [...prev];
          updated[index] = { ...step, isActive: true };
          return updated;
        });

        // Mark as complete after a short delay
        setTimeout(() => {
          setReasoningSteps(prev => {
            const updated = [...prev];
            updated[index] = { ...step, isComplete: true, isActive: false };
            return updated;
          });
        }, 600);
      }, index * 800); // Stagger by 800ms
    });
  };

  // Handle feedback
  const handleFeedback = async (feedbackType: 'positive' | 'negative', reason?: string) => {
    if (!messageId || feedbackGiven) return;

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'demo-user',
          messageId,
          feedback: feedbackType,
          reason,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setFeedbackGiven(true);
        showToastMessage(
          feedbackType === 'positive'
            ? '✅ Thanks! Your feedback helps improve translations.'
            : '📝 Feedback received. The agent is learning!'
        );
      }
    } catch (err) {
      console.error('Feedback error:', err);
      showToastMessage('❌ Failed to submit feedback');
    }
  };

  // Show toast notification
  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Clear form
  const handleClear = () => {
    setInputText('');
    setTranslation('');
    setReasoningSteps([]);
    setError('');
    setFeedbackGiven(false);
    setMessageId('');
    setDetectedContext(null);
    setShowSuggestion(false);
    setShowLowConfidenceWarning(false);
    setSuggestedPreferences(null);
  };

  // Get confidence color
  const getConfidenceColor = () => {
    if (confidence >= 0.85) return 'from-green-500 to-emerald-600';
    if (confidence >= 0.70) return 'from-yellow-500 to-amber-600';
    return 'from-red-500 to-orange-600';
  };

  // Get confidence text color
  const getConfidenceTextColor = () => {
    if (confidence >= 0.85) return 'text-green-600';
    if (confidence >= 0.70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-3">
            Cultural Translation Agent
          </h1>
          <p className="text-gray-600 text-lg">
            AI-powered translation with cultural awareness and learning
          </p>
        </div>

        {/* 3-Panel Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">

          {/* LEFT PANEL - Input Section */}
          <div className="lg:col-span-3">
            <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl border border-white/50 p-6 h-full">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span className="text-2xl">💬</span> Input
              </h2>

              {/* Input Textarea */}
              <div className="mb-4">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Enter text to translate..."
                  rows={6}
                  maxLength={maxChars}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none text-gray-800 placeholder-gray-400"
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-500">
                    {charCount}/{maxChars} characters
                  </span>
                  {charCount > maxChars * 0.9 && (
                    <span className="text-xs text-red-500 font-medium">
                      ⚠️ Near limit
                    </span>
                  )}
                </div>
              </div>

              {/* Language Dropdown */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Language
                </label>
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white text-gray-800"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Context Suggestion Card */}
              {showSuggestion && detectedContext && (
                <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl shadow-md animate-slideDown">
                  <button
                    onClick={dismissSuggestion}
                    className="float-right text-gray-400 hover:text-gray-600 font-bold"
                  >
                    ✕
                  </button>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">💡</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 mb-3">
                        This looks like a <strong>{detectedContext.type}</strong> context - should I use a <strong>{detectedContext.suggestedTone}</strong> tone?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={applySuggestedPreferences}
                          className="flex-1 py-2 px-3 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-all"
                        >
                          Yes, apply
                        </button>
                        <button
                          onClick={dismissSuggestion}
                          className="flex-1 py-2 px-3 bg-white text-blue-600 border-2 border-blue-300 rounded-lg font-medium text-sm hover:bg-blue-50 transition-all"
                        >
                          No, I&apos;ll decide
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Memory-Based Suggestion Card */}
              {showMemorySuggestion && memorySuggestion && !showSuggestion && (
                <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-xl shadow-md animate-slideDown">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🧠</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-purple-900">
                        I remember you prefer <strong>{Math.round(memorySuggestion.formality * 100)}%</strong> formality for <strong>{memorySuggestion.language}</strong>
                      </p>
                      <p className="text-xs text-purple-700 mt-1">
                        This will be automatically applied unless you change it
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Translate Button */}
              <button
                onClick={handleTranslate}
                disabled={loading || !inputText.trim()}
                className={`w-full py-4 rounded-xl font-semibold text-white transition-all ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-primary to-secondary hover:shadow-lg hover:scale-105 active:scale-95'
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⚡</span>
                    Translating...
                  </span>
                ) : (
                  'Translate'
                )}
              </button>

              {/* Clear Button */}
              {(translation || inputText) && (
                <button
                  onClick={handleClear}
                  className="w-full mt-3 py-2 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
                >
                  Clear
                </button>
              )}

              {/* Error Message */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 border-2 border-red-200 rounded-xl">
                  <p className="text-red-700 text-sm">❌ {error}</p>
                </div>
              )}
            </div>
          </div>

          {/* CENTER PANEL - Agent Reasoning */}
          <div className="lg:col-span-4">
            <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl border border-white/50 p-6 h-full">
              <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                <span className="text-2xl">🤖</span> Agent Thinking Process
              </h2>

              {/* Reasoning Steps */}
              <div className="space-y-4">
                {reasoningSteps.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <div className="text-6xl mb-4">🧠</div>
                    <p>Agent reasoning will appear here...</p>
                  </div>
                ) : (
                  reasoningSteps.map((step, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-xl border-2 transition-all duration-500 ${
                        step.isComplete
                          ? 'bg-green-50 border-green-300'
                          : step.isActive
                          ? 'bg-blue-50 border-blue-300 animate-pulse'
                          : 'bg-gray-50 border-gray-200 opacity-50'
                      }`}
                      style={{
                        animation: step.isComplete || step.isActive ? 'fadeIn 0.5s ease-in' : 'none',
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-3xl">{step.icon}</span>
                        <div className="flex-1">
                          <h3 className={`font-bold mb-1 ${
                            step.isComplete ? 'text-green-700' : step.isActive ? 'text-blue-700' : 'text-gray-500'
                          }`}>
                            {step.label}
                            {step.isActive && !step.isComplete && (
                              <span className="ml-2 text-sm">
                                <span className="animate-pulse">.</span>
                                <span className="animate-pulse animation-delay-200">.</span>
                                <span className="animate-pulse animation-delay-400">.</span>
                              </span>
                            )}
                          </h3>
                          {step.text && (
                            <p className="text-sm text-gray-600 leading-relaxed">
                              {step.text}
                            </p>
                          )}
                        </div>
                        {step.isComplete && (
                          <span className="text-green-500 text-xl">✓</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL - Output Section */}
          <div className="lg:col-span-3">
            <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl border border-white/50 p-6 h-full">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span className="text-2xl">✨</span> Translation
              </h2>

              {/* Translation Output */}
              {translation ? (
                <div className="space-y-6">
                  {/* Low Confidence Warning */}
                  {showLowConfidenceWarning && (
                    <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-400 rounded-xl mb-4 animate-slideDown">
                      <div className="flex items-start gap-3 mb-3">
                        <span className="text-2xl">⚠️</span>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-amber-900 mb-1">
                            I&apos;m uncertain about this translation
                          </p>
                          <p className="text-xs text-amber-800 leading-relaxed">
                            {lowConfidenceReason}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-amber-700 font-medium">
                        💡 Would you like to rephrase or add more context?
                      </p>
                    </div>
                  )}

                  {/* Translated Text */}
                  <div className="p-4 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl border-2 border-primary/20">
                    <p className="text-lg leading-relaxed text-gray-800 font-medium">
                      {translation}
                    </p>
                  </div>

                  {/* Confidence Meter */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Confidence
                      </span>
                      <span className={`text-sm font-bold ${getConfidenceTextColor()}`}>
                        {Math.round(confidence * 100)}%
                      </span>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${getConfidenceColor()} transition-all duration-1000 ease-out`}
                        style={{ width: `${confidence * 100}%` }}
                      />
                    </div>
                    {confidence < 0.70 && (
                      <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                        <span>⚠️</span>
                        Low confidence - agent is uncertain
                      </p>
                    )}
                  </div>

                  {/* Memory Badge */}
                  <div className={`px-4 py-2 rounded-xl text-sm font-medium ${
                    memoryUsed
                      ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                      : 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                  }`}>
                    {memoryUsed ? '🧠 Memory Used' : '🆕 No Memory Yet'}
                  </div>

                  {/* Feedback Buttons */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">
                      Was this translation helpful?
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleFeedback('positive')}
                        disabled={feedbackGiven}
                        className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                          feedbackGiven
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-green-50 text-green-700 border-2 border-green-300 hover:bg-green-100 hover:scale-105 active:scale-95'
                        }`}
                      >
                        👍 Good
                      </button>
                      <button
                        onClick={() => handleFeedback('negative', 'Translation needs improvement')}
                        disabled={feedbackGiven}
                        className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                          feedbackGiven
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-red-50 text-red-700 border-2 border-red-300 hover:bg-red-100 hover:scale-105 active:scale-95'
                        }`}
                      >
                        👎 Needs Work
                      </button>
                    </div>
                    {feedbackGiven && (
                      <p className="text-xs text-green-600 mt-2 text-center">
                        ✓ Feedback submitted
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-6xl mb-4">🌍</div>
                  <p>Translation will appear here...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-8 right-8 bg-gray-900 text-white px-6 py-4 rounded-xl shadow-2xl animate-slideIn z-50">
          {toastMessage}
        </div>
      )}

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
            max-height: 0;
          }
          to {
            opacity: 1;
            transform: translateY(0);
            max-height: 300px;
          }
        }
        .animation-delay-200 {
          animation-delay: 0.2s;
        }
        .animation-delay-400 {
          animation-delay: 0.4s;
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
        .animate-slideDown {
          animation: slideDown 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}

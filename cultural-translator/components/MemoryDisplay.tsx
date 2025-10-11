'use client';

import { useEffect, useState } from 'react';

interface LanguagePreference {
  formality: number;
  directness: number;
  interactionCount: number;
  lastUpdated: Date;
}

interface MemoryData {
  userId: string;
  preferences: {
    [languagePair: string]: LanguagePreference;
  };
  feedbackStats?: {
    consecutiveNegative: number;
    totalPositive: number;
    totalNegative: number;
    lastFeedbackTimestamp: Date;
  };
}

interface MemoryDisplayProps {
  userId?: string;
  refreshTrigger?: number; // Increment this to force refresh
}

export default function MemoryDisplay({ userId = 'demo-user', refreshTrigger = 0 }: MemoryDisplayProps) {
  const [memoryData, setMemoryData] = useState<MemoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalMemories, setTotalMemories] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchMemoryData();
  }, [userId, refreshTrigger]);

  const fetchMemoryData = async () => {
    if (refreshTrigger > 0) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const response = await fetch(`/api/memory?userId=${userId}`);
      const data = await response.json();

      if (response.ok && data.memory) {
        setMemoryData(data.memory);
        setTotalMemories(Object.keys(data.memory.preferences || {}).length);
      } else {
        // No memory yet
        setMemoryData(null);
        setTotalMemories(0);
      }
    } catch (err) {
      console.error('Failed to fetch memory:', err);
      setError('Failed to load memory data');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const getConfidenceColor = (value: number) => {
    if (value >= 0.7) return 'from-green-500 to-emerald-600';
    if (value >= 0.5) return 'from-yellow-500 to-amber-600';
    return 'from-red-500 to-orange-600';
  };

  const getConfidenceTextColor = (value: number) => {
    if (value >= 0.7) return 'text-green-600';
    if (value >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getFormalityLabel = (value: number) => {
    if (value >= 0.8) return 'Very Formal';
    if (value >= 0.6) return 'Formal';
    if (value >= 0.4) return 'Neutral';
    if (value >= 0.2) return 'Casual';
    return 'Very Casual';
  };

  const getDirectnessLabel = (value: number) => {
    if (value >= 0.8) return 'Very Direct';
    if (value >= 0.6) return 'Direct';
    if (value >= 0.4) return 'Balanced';
    if (value >= 0.2) return 'Indirect';
    return 'Very Indirect';
  };

  const calculateConfidence = (interactionCount: number) => {
    // Confidence grows with interactions, maxing out at 90%
    return Math.min(0.9, 0.3 + (interactionCount * 0.15));
  };

  if (loading && !isRefreshing) {
    return (
      <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl border border-white/50 p-6 h-full">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">🧠</span>
          <h2 className="text-xl font-semibold text-gray-800">Agent Memory</h2>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-xl bg-gray-100 animate-pulse">
              <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl border border-white/50 p-6 h-full relative overflow-hidden">
      {/* Refresh Animation */}
      {isRefreshing && (
        <div className="absolute inset-0 bg-purple-500/10 flex items-center justify-center z-10 animate-pulse">
          <div className="text-4xl animate-spin">🔄</div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🧠</span>
          <h2 className="text-xl font-semibold text-gray-800">Agent Memory</h2>
        </div>
        <div className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-bold border-2 border-purple-300">
          {totalMemories} {totalMemories === 1 ? 'Language' : 'Languages'}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border-2 border-red-200 rounded-xl mb-4">
          <p className="text-red-700 text-sm">❌ {error}</p>
        </div>
      )}

      {!memoryData || totalMemories === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4 animate-bounce">💭</div>
          <p className="text-gray-500 text-sm font-medium mb-2">No memories yet</p>
          <p className="text-gray-400 text-xs">
            The agent will learn your preferences as you translate
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Feedback Stats */}
          {memoryData.feedbackStats && (memoryData.feedbackStats.totalPositive > 0 || memoryData.feedbackStats.totalNegative > 0) && (
            <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200">
              <h3 className="text-sm font-bold text-purple-900 mb-3 flex items-center gap-2">
                <span>📊</span> Feedback Summary
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {memoryData.feedbackStats.totalPositive}
                  </div>
                  <div className="text-xs text-gray-600">Positive</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {memoryData.feedbackStats.totalNegative}
                  </div>
                  <div className="text-xs text-gray-600">Negative</div>
                </div>
              </div>
              {memoryData.feedbackStats.consecutiveNegative >= 2 && (
                <div className="mt-3 p-2 bg-amber-100 border border-amber-300 rounded-lg">
                  <p className="text-xs text-amber-800 font-medium">
                    ⚠️ Adjusting preferences based on recent feedback
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Language Preferences */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span>🌍</span> Learned Preferences
            </h3>
            <div className="space-y-4">
              {Object.entries(memoryData.preferences).map(([langPair, pref]) => {
                const confidence = calculateConfidence(pref.interactionCount);
                return (
                  <div
                    key={langPair}
                    className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 hover:shadow-lg transition-all duration-300 hover:scale-105"
                  >
                    {/* Language Header */}
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-blue-900 text-sm">
                        {langPair.replace('English-', '')}
                      </h4>
                      <div className="text-xs bg-white/70 px-2 py-1 rounded-full border border-blue-300">
                        {pref.interactionCount} interaction{pref.interactionCount !== 1 ? 's' : ''}
                      </div>
                    </div>

                    {/* Confidence Meter */}
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-gray-600">Learning Confidence</span>
                        <span className={`text-xs font-bold ${getConfidenceTextColor(confidence)}`}>
                          {Math.round(confidence * 100)}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${getConfidenceColor(confidence)} transition-all duration-500`}
                          style={{ width: `${confidence * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Formality Preference */}
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-gray-600">Formality</span>
                        <span className="text-xs font-bold text-purple-600">
                          {getFormalityLabel(pref.formality)}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all duration-500"
                          style={{ width: `${pref.formality * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Directness Preference */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-gray-600">Directness</span>
                        <span className="text-xs font-bold text-indigo-600">
                          {getDirectnessLabel(pref.directness)}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 transition-all duration-500"
                          style={{ width: `${pref.directness * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Last Updated */}
                    <div className="mt-3 text-xs text-gray-500">
                      Updated: {new Date(pref.lastUpdated).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Learning Status */}
          <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
            <div className="flex items-start gap-3">
              <span className="text-2xl">✨</span>
              <div>
                <p className="text-sm font-bold text-green-900 mb-1">
                  Agent is Learning!
                </p>
                <p className="text-xs text-green-700 leading-relaxed">
                  Each translation helps me understand your preferences better. Keep providing feedback for improved accuracy.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}

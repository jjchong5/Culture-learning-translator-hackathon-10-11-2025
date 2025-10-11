'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Types
interface EvolutionPoint {
  interaction: number;
  formality: number;
  directness: number;
  timestamp: Date;
}

interface LanguagePair {
  pair: string;
  count: number;
  formality: number;
  directness: number;
  lastUpdated: Date | null;
}

interface Stats {
  totalTranslations: number;
  avgConfidence: number;
  feedbackRatio: number;
  culturalPatternsLearned: number;
  accuracyTrend: 'up' | 'down' | 'neutral';
  languagePairs: LanguagePair[];
  positiveFeedback: number;
  negativeFeedback: number;
}

interface RecentLog {
  id: string;
  originalText: string;
  translation: string;
  targetLang: string;
  confidence: number;
  reasoning: string[];
  feedback: 'positive' | 'negative' | null;
  feedbackTimestamp: Date | null;
  timestamp: Date;
}

interface DashboardData {
  memory: {
    userId: string;
    preferences: Record<string, unknown>;
    feedbackStats: {
      totalPositive: number;
      totalNegative: number;
      consecutiveNegative: number;
      lastFeedbackTimestamp: Date | null;
    };
    evolution: EvolutionPoint[];
  } | null;
  recentLogs: RecentLog[];
  stats: Stats;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard?userId=demo');
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.error || 'Failed to load dashboard data');
      }
    } catch (err) {
      setError('Network error - could not fetch dashboard data');
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return 'border-green-500 bg-green-50';
    if (confidence >= 0.4) return 'border-yellow-500 bg-yellow-50';
    return 'border-red-500 bg-red-50';
  };

  const getConfidenceBadgeColor = (confidence: number) => {
    if (confidence >= 0.7) return 'bg-green-500';
    if (confidence >= 0.4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-8 max-w-md">
          <h2 className="text-red-400 text-xl font-bold mb-2">Error</h2>
          <p className="text-red-300">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { memory, recentLogs, stats } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Agent Learning Dashboard</h1>
            <p className="text-purple-300">Visual proof of AI adaptation and learning</p>
          </div>
          <Link
            href="/"
            className="px-6 py-3 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 transition-all duration-300 border border-white/20"
          >
            ← Back to Home
          </Link>
        </div>

        {/* SECTION 1 - Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Translations */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-purple-300 text-sm font-medium">Total Translations</h3>
              <span className="text-3xl">🌐</span>
            </div>
            <p className="text-4xl font-bold text-white">{stats.totalTranslations}</p>
            <p className="text-purple-400 text-xs mt-2">All-time interactions</p>
          </div>

          {/* Current Confidence */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-purple-300 text-sm font-medium">Avg Confidence</h3>
              <span className="text-3xl">📊</span>
            </div>
            <p className="text-4xl font-bold text-white">{Math.round(stats.avgConfidence * 100)}%</p>
            <p className="text-purple-400 text-xs mt-2">Translation certainty</p>
          </div>

          {/* Cultural Patterns Learned */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-purple-300 text-sm font-medium">Patterns Learned</h3>
              <span className="text-3xl">🧠</span>
            </div>
            <p className="text-4xl font-bold text-white">{stats.culturalPatternsLearned}</p>
            <p className="text-purple-400 text-xs mt-2">Language pairs &gt;3 interactions</p>
          </div>

          {/* Accuracy Trend */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-purple-300 text-sm font-medium">Accuracy Trend</h3>
              <span className="text-3xl">
                {stats.accuracyTrend === 'up' ? '📈' : stats.accuracyTrend === 'down' ? '📉' : '➡️'}
              </span>
            </div>
            <p className="text-4xl font-bold text-white">
              {stats.accuracyTrend === 'up' ? '↗' : stats.accuracyTrend === 'down' ? '↘' : '→'}
            </p>
            <p className="text-purple-400 text-xs mt-2">
              {stats.positiveFeedback}+ / {stats.negativeFeedback}- feedback
            </p>
          </div>
        </div>

        {/* SECTION 2 & 3 - Chart and Preferences */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* SECTION 2 - Memory Evolution Chart */}
          <div className="lg:col-span-2 bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Learning Progress - Formality Preference</h2>
            {memory && memory.evolution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={memory.evolution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                  <XAxis
                    dataKey="interaction"
                    stroke="#fff"
                    label={{ value: 'Interaction Number', position: 'insideBottom', offset: -5, fill: '#fff' }}
                  />
                  <YAxis
                    domain={[0, 1]}
                    stroke="#fff"
                    label={{ value: 'Formality Level', angle: -90, position: 'insideLeft', fill: '#fff' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e1b4b',
                      border: '1px solid #8b5cf6',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                    labelStyle={{ color: '#c4b5fd' }}
                  />
                  <Legend wrapperStyle={{ color: '#fff' }} />
                  <Line
                    type="monotone"
                    dataKey="formality"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    dot={{ fill: '#8b5cf6', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Formality"
                  />
                  <Line
                    type="monotone"
                    dataKey="directness"
                    stroke="#ec4899"
                    strokeWidth={3}
                    dot={{ fill: '#ec4899', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Directness"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-purple-300">
                <p>No learning data yet. Start translating to see your progress!</p>
              </div>
            )}
          </div>

          {/* SECTION 3 - Current Preferences */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Current Preferences</h2>

            {stats.languagePairs.length > 0 ? (
              <div className="space-y-6">
                {stats.languagePairs.map((langPair) => (
                  <div key={langPair.pair} className="border-b border-white/20 pb-4 last:border-b-0">
                    {/* Language Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-3 py-1 bg-purple-500 text-white rounded-full text-sm font-medium">
                        {langPair.pair}
                      </span>
                      <span className="text-purple-300 text-xs">{langPair.count} interactions</span>
                    </div>

                    {/* Formality Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-purple-300 mb-1">
                        <span>Formality</span>
                        <span>{Math.round(langPair.formality * 100)}%</span>
                      </div>
                      <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                          style={{ width: `${langPair.formality * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Directness Bar */}
                    <div className="mb-2">
                      <div className="flex justify-between text-xs text-purple-300 mb-1">
                        <span>Directness</span>
                        <span>{Math.round(langPair.directness * 100)}%</span>
                      </div>
                      <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                          style={{ width: `${langPair.directness * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Last Updated */}
                    <p className="text-xs text-purple-400 mt-2">
                      Updated: {formatDate(langPair.lastUpdated)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-purple-300 py-8">
                <p>No preferences yet</p>
                <p className="text-sm mt-2">Start translating to build your profile!</p>
              </div>
            )}

            {/* Feedback Stats */}
            {memory && (
              <div className="mt-6 pt-6 border-t border-white/20">
                <h3 className="text-white font-medium mb-3">Feedback Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-purple-300">
                    <span>👍 Positive:</span>
                    <span className="text-white font-medium">{memory.feedbackStats.totalPositive}</span>
                  </div>
                  <div className="flex justify-between text-purple-300">
                    <span>👎 Negative:</span>
                    <span className="text-white font-medium">{memory.feedbackStats.totalNegative}</span>
                  </div>
                  <div className="flex justify-between text-purple-300">
                    <span>🔁 Consecutive:</span>
                    <span className="text-white font-medium">{memory.feedbackStats.consecutiveNegative}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 4 - Recent Reasoning Logs */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-6">Recent Translation Logs</h2>

          {recentLogs.length > 0 ? (
            <div className="space-y-4">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className={`border-l-4 ${getConfidenceColor(log.confidence)} rounded-lg p-4 cursor-pointer hover:shadow-lg transition-all duration-300`}
                  onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {log.targetLang}
                        </span>
                        <span className={`text-xs px-2 py-1 ${getConfidenceBadgeColor(log.confidence)} text-white rounded-full`}>
                          {Math.round(log.confidence * 100)}% confidence
                        </span>
                        {log.feedback && (
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            log.feedback === 'positive' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                          }`}>
                            {log.feedback === 'positive' ? '👍' : '👎'} {log.feedback}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-800 font-medium mb-1">&quot;{log.originalText}&quot;</p>
                      <p className="text-gray-600 italic">→ &quot;{log.translation}&quot;</p>
                    </div>
                    <span className="text-gray-500 text-xs ml-4">
                      {formatDate(log.timestamp)}
                    </span>
                  </div>

                  {/* Collapsible Reasoning */}
                  {expandedLogId === log.id && (
                    <div className="mt-4 pt-4 border-t border-gray-300 animate-fadeIn">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">🔍 Agent Reasoning:</h4>
                      <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                        {log.reasoning.map((step, idx) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-purple-300 py-12">
              <p className="text-lg">No translation logs yet</p>
              <p className="text-sm mt-2">Start translating to see your history here!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { UserMemory } from '@/lib/types';

/**
 * GET endpoint - Fetch dashboard data for user
 * Returns user memory, recent logs, and aggregate statistics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'demo';

    const db = await connectToDatabase();

    // Fetch user memory
    const userMemoryCollection = db.collection<UserMemory>('user_memory');
    const userMemory = await userMemoryCollection.findOne({ userId });

    // Fetch all agent logs for this user
    const agentLogsCollection = db.collection('agent_logs');
    const allLogs = await agentLogsCollection
      .find({ userId })
      .sort({ timestamp: -1 })
      .toArray();

    // Fetch recent logs with details (last 10)
    const recentLogs = allLogs.slice(0, 10).map((log) => ({
      id: log._id.toString(),
      originalText: log.originalText,
      translation: log.translation,
      targetLang: log.targetLang,
      confidence: log.confidence,
      reasoning: log.reasoning,
      feedback: log.feedback || null,
      feedbackTimestamp: log.feedbackTimestamp || null,
      timestamp: log.timestamp,
    }));

    // Calculate aggregate statistics
    const totalTranslations = allLogs.length;

    // Average confidence
    const avgConfidence =
      totalTranslations > 0
        ? allLogs.reduce((sum, log) => sum + (log.confidence || 0), 0) / totalTranslations
        : 0;

    // Feedback statistics
    const logsWithFeedback = allLogs.filter((log) => log.feedback);
    const positiveFeedback = logsWithFeedback.filter((log) => log.feedback === 'positive').length;
    const negativeFeedback = logsWithFeedback.filter((log) => log.feedback === 'negative').length;
    const totalFeedback = logsWithFeedback.length;
    const feedbackRatio =
      totalFeedback > 0 ? (positiveFeedback / totalFeedback) * 100 : 0;

    // Language pairs with >3 interactions
    const languagePairCounts: Record<string, number> = {};
    allLogs.forEach((log) => {
      const pair = `*->${log.targetLang}`;
      languagePairCounts[pair] = (languagePairCounts[pair] || 0) + 1;
    });

    const culturalPatternsLearned = Object.entries(languagePairCounts).filter(
      ([, count]) => count > 3
    ).length;

    const languagePairs = Object.entries(languagePairCounts).map(([pair, count]) => ({
      pair,
      count,
      formality: userMemory?.preferences[pair]?.formality || 0.5,
      directness: userMemory?.preferences[pair]?.directness || 0.5,
      lastUpdated: userMemory?.preferences[pair]?.lastUpdated || null,
    }));

    // Accuracy trend (comparing recent vs older feedback)
    let accuracyTrend: 'up' | 'down' | 'neutral' = 'neutral';
    if (totalFeedback >= 6) {
      const recentFeedback = logsWithFeedback.slice(0, 3);
      const olderFeedback = logsWithFeedback.slice(3, 6);

      const recentPositiveRatio =
        recentFeedback.filter((log) => log.feedback === 'positive').length /
        recentFeedback.length;
      const olderPositiveRatio =
        olderFeedback.filter((log) => log.feedback === 'positive').length /
        olderFeedback.length;

      if (recentPositiveRatio > olderPositiveRatio + 0.1) {
        accuracyTrend = 'up';
      } else if (recentPositiveRatio < olderPositiveRatio - 0.1) {
        accuracyTrend = 'down';
      }
    }

    // Prepare evolution data for chart
    const evolution = userMemory?.evolution
      ? userMemory.evolution.map((point, index) => ({
          interaction: index + 1,
          formality: point.formality,
          directness: point.directness,
          timestamp: point.timestamp,
        }))
      : [];

    // Response data
    return NextResponse.json({
      success: true,
      data: {
        memory: userMemory
          ? {
              userId: userMemory.userId,
              preferences: userMemory.preferences,
              feedbackStats: userMemory.feedbackStats || {
                totalPositive: 0,
                totalNegative: 0,
                consecutiveNegative: 0,
                lastFeedbackTimestamp: null,
              },
              evolution,
            }
          : null,
        recentLogs,
        stats: {
          totalTranslations,
          avgConfidence: Math.round(avgConfidence * 100) / 100,
          feedbackRatio: Math.round(feedbackRatio * 100) / 100,
          culturalPatternsLearned,
          accuracyTrend,
          languagePairs,
          positiveFeedback,
          negativeFeedback,
        },
      },
    });
  } catch (error) {
    console.error('Dashboard API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

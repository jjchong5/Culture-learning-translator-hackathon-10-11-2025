import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';
import { UserMemory } from '@/lib/types';

// Feedback request interface
interface FeedbackRequest {
  userId: string;
  messageId: string;
  feedback: 'positive' | 'negative';
  reason?: string;
}

// Feedback response interfaces
interface PositiveFeedbackResponse {
  success: true;
  message: string;
}

interface NegativeFeedbackResponse {
  success: true;
  message: string;
  adjustedPreferences: {
    formality: number;
    directness: number;
  };
}

type FeedbackResponse = PositiveFeedbackResponse | NegativeFeedbackResponse;

/**
 * Analyze negative feedback reason to determine adjustment direction
 */
function analyzeFeedbackReason(reason: string): {
  adjustFormality: number;
  adjustDirectness: number;
} {
  const lowerReason = reason.toLowerCase();

  let adjustFormality = 0;
  let adjustDirectness = 0;

  // Formality adjustments
  if (lowerReason.includes('too formal') || lowerReason.includes('stiff') || lowerReason.includes('rigid')) {
    adjustFormality = -0.15; // Make more casual
  } else if (lowerReason.includes('too casual') || lowerReason.includes('unprofessional') || lowerReason.includes('informal')) {
    adjustFormality = 0.15; // Make more formal
  }

  // Directness adjustments
  if (lowerReason.includes('too direct') || lowerReason.includes('blunt') || lowerReason.includes('harsh')) {
    adjustDirectness = -0.15; // Make more indirect
  } else if (lowerReason.includes('too indirect') || lowerReason.includes('vague') || lowerReason.includes('unclear')) {
    adjustDirectness = 0.15; // Make more direct
  }

  // If no specific reason detected, use default negative adjustment
  if (adjustFormality === 0 && adjustDirectness === 0) {
    adjustFormality = -0.1;
    adjustDirectness = -0.1;
  }

  return { adjustFormality, adjustDirectness };
}

/**
 * Clamp value between 0 and 1
 */
function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Handle positive feedback - reinforce current preferences
 */
async function handlePositiveFeedback(
  userId: string,
  messageId: string
): Promise<PositiveFeedbackResponse> {
  try {
    const db = await connectToDatabase();
    const timestamp = new Date();

    // Get the original message to know which language pair to update
    const messagesCollection = db.collection('messages');
    const message = await messagesCollection.findOne({ _id: new ObjectId(messageId) });

    if (!message) {
      throw new Error('Message not found');
    }

    const targetLang = message.targetLang;
    const languagePair = `*->${targetLang}`;

    // Get current user memory
    const userMemoryCollection = db.collection<UserMemory>('user_memory');
    const userMemory = await userMemoryCollection.findOne({ userId });

    // Get preferences or use defaults from message analysis
    let currentFormality = 0.5;
    let currentDirectness = 0.5;

    if (userMemory?.preferences[languagePair]) {
      currentFormality = userMemory.preferences[languagePair].formality;
      currentDirectness = userMemory.preferences[languagePair].directness;
    } else if (message.analysis) {
      // Use analysis from the message to infer preferences
      currentFormality = message.analysis.tone === 'formal' ? 0.8 : message.analysis.tone === 'casual' ? 0.2 : 0.5;
      currentDirectness = message.analysis.context === 'business' ? 0.7 : 0.5;
    }

    // Reinforce current preferences (move slightly toward current values)
    const reinforcedFormality = clamp(currentFormality + 0.05);
    const reinforcedDirectness = clamp(currentDirectness + 0.05);

    // Update user memory (create if doesn't exist)
    await userMemoryCollection.updateOne(
      { userId },
      {
        $set: {
          [`preferences.${languagePair}.formality`]: reinforcedFormality,
          [`preferences.${languagePair}.directness`]: reinforcedDirectness,
          [`preferences.${languagePair}.lastUpdated`]: timestamp,
          'feedbackStats.consecutiveNegative': 0, // Reset consecutive negative counter
          'feedbackStats.lastFeedbackTimestamp': timestamp,
        },
        $push: {
          evolution: {
            timestamp,
            formality: reinforcedFormality,
            directness: reinforcedDirectness,
          },
        },
        $inc: {
          'feedbackStats.totalPositive': 1,
          [`preferences.${languagePair}.interactionCount`]: 1,
        },
        $setOnInsert: {
          userId,
        },
      },
      { upsert: true }
    );

    // Update agent_logs with feedback
    const agentLogsCollection = db.collection('agent_logs');
    await agentLogsCollection.updateOne(
      {
        userId,
        originalText: message.originalText,
        translation: message.translation,
        timestamp: message.timestamp,
      },
      {
        $set: {
          feedback: 'positive',
          feedbackTimestamp: timestamp,
        },
      }
    );

    // Mark message with feedback status
    await messagesCollection.updateOne(
      { _id: new ObjectId(messageId) },
      {
        $set: {
          feedback: 'positive',
          feedbackTimestamp: timestamp,
        },
      }
    );

    return {
      success: true,
      message: 'Preference reinforced - learning from your positive feedback',
    };
  } catch (error) {
    console.error('Positive feedback error:', error);
    throw error;
  }
}

/**
 * Handle negative feedback - adjust preferences in opposite direction
 */
async function handleNegativeFeedback(
  userId: string,
  messageId: string,
  reason?: string
): Promise<NegativeFeedbackResponse> {
  try {
    const db = await connectToDatabase();
    const timestamp = new Date();

    // Get the original message
    const messagesCollection = db.collection('messages');
    const message = await messagesCollection.findOne({ _id: new ObjectId(messageId) });

    if (!message) {
      throw new Error('Message not found');
    }

    const targetLang = message.targetLang;
    const languagePair = `*->${targetLang}`;

    // Get current user memory
    const userMemoryCollection = db.collection<UserMemory>('user_memory');
    const userMemory = await userMemoryCollection.findOne({ userId });

    // Get preferences or use defaults from message analysis
    let currentFormality = 0.5;
    let currentDirectness = 0.5;

    if (userMemory?.preferences[languagePair]) {
      currentFormality = userMemory.preferences[languagePair].formality;
      currentDirectness = userMemory.preferences[languagePair].directness;
    } else if (message.analysis) {
      // Use analysis from the message to infer preferences
      currentFormality = message.analysis.tone === 'formal' ? 0.8 : message.analysis.tone === 'casual' ? 0.2 : 0.5;
      currentDirectness = message.analysis.context === 'business' ? 0.7 : 0.5;
    }

    // Determine adjustment based on reason (if provided)
    let adjustFormality: number;
    let adjustDirectness: number;

    if (reason) {
      const analysis = analyzeFeedbackReason(reason);
      adjustFormality = analysis.adjustFormality;
      adjustDirectness = analysis.adjustDirectness;
    } else {
      // Default: adjust in opposite direction
      adjustFormality = -0.1;
      adjustDirectness = -0.1;
    }

    // Get current feedback stats
    const feedbackStats = userMemory?.feedbackStats;
    const consecutiveNegative = (feedbackStats?.consecutiveNegative || 0) + 1;
    const totalNegative = (feedbackStats?.totalNegative || 0) + 1;

    // Check if we should reset to neutral (after 3 consecutive negative feedbacks)
    let newFormality: number;
    let newDirectness: number;

    if (consecutiveNegative >= 3) {
      // Reset to neutral
      newFormality = 0.5;
      newDirectness = 0.5;
    } else {
      // Apply adjustments
      newFormality = clamp(currentFormality + adjustFormality);
      newDirectness = clamp(currentDirectness + adjustDirectness);
    }

    // Update user memory (create if doesn't exist)
    await userMemoryCollection.updateOne(
      { userId },
      {
        $set: {
          [`preferences.${languagePair}.formality`]: newFormality,
          [`preferences.${languagePair}.directness`]: newDirectness,
          [`preferences.${languagePair}.lastUpdated`]: timestamp,
          'feedbackStats.consecutiveNegative': consecutiveNegative,
          'feedbackStats.totalNegative': totalNegative,
          'feedbackStats.lastFeedbackTimestamp': timestamp,
        },
        $push: {
          evolution: {
            timestamp,
            formality: newFormality,
            directness: newDirectness,
          },
        },
        $inc: {
          [`preferences.${languagePair}.interactionCount`]: 1,
        },
        $setOnInsert: {
          userId,
        },
      },
      { upsert: true }
    );

    // Update agent_logs with feedback and reason
    const agentLogsCollection = db.collection('agent_logs');
    await agentLogsCollection.updateOne(
      {
        userId,
        originalText: message.originalText,
        translation: message.translation,
        timestamp: message.timestamp,
      },
      {
        $set: {
          feedback: 'negative',
          feedbackTimestamp: timestamp,
          feedbackReason: reason || 'No reason provided',
        },
      }
    );

    // Mark message with feedback status
    await messagesCollection.updateOne(
      { _id: new ObjectId(messageId) },
      {
        $set: {
          feedback: 'negative',
          feedbackTimestamp: timestamp,
          feedbackReason: reason || 'No reason provided',
        },
      }
    );

    const responseMessage = consecutiveNegative >= 3
      ? 'After 3 consecutive negative feedbacks, preferences reset to neutral. Let\'s recalibrate!'
      : reason
      ? 'Learning from feedback - adjusted preferences based on your input'
      : 'Learning from feedback - adjusted preferences';

    return {
      success: true,
      message: responseMessage,
      adjustedPreferences: {
        formality: newFormality,
        directness: newDirectness,
      },
    };
  } catch (error) {
    console.error('Negative feedback error:', error);
    throw error;
  }
}

/**
 * POST endpoint - Process user feedback for learning loop
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body: FeedbackRequest = await request.json();
    const { userId, messageId, feedback, reason } = body;

    // Validation
    if (!userId || !messageId || !feedback) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: userId, messageId, and feedback are required',
        },
        { status: 400 }
      );
    }

    if (feedback !== 'positive' && feedback !== 'negative') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid feedback value. Must be "positive" or "negative"',
        },
        { status: 400 }
      );
    }

    // Validate messageId format
    if (!ObjectId.isValid(messageId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid messageId format',
        },
        { status: 400 }
      );
    }

    // Process feedback based on type
    let response: FeedbackResponse;

    if (feedback === 'positive') {
      response = await handlePositiveFeedback(userId, messageId);
    } else {
      response = await handleNegativeFeedback(userId, messageId, reason);
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Feedback endpoint error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    // Check for specific error types
    if (errorMessage.includes('not found')) {
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: `Failed to process feedback: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint - Retrieve feedback statistics for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing userId parameter',
        },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const userMemoryCollection = db.collection<UserMemory>('user_memory');

    const userMemory = await userMemoryCollection.findOne({ userId });

    if (!userMemory) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    // Extract feedback stats
    const feedbackStats = userMemory.feedbackStats;

    return NextResponse.json({
      success: true,
      stats: {
        totalPositive: feedbackStats?.totalPositive || 0,
        totalNegative: feedbackStats?.totalNegative || 0,
        consecutiveNegative: feedbackStats?.consecutiveNegative || 0,
        lastFeedback: feedbackStats?.lastFeedbackTimestamp || null,
      },
      preferences: userMemory.preferences,
      evolution: userMemory.evolution,
    });

  } catch (error) {
    console.error('Get feedback stats error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve feedback statistics',
      },
      { status: 500 }
    );
  }
}

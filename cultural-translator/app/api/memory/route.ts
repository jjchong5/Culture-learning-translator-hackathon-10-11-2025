import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { UserMemory } from '@/lib/types';

/**
 * GET endpoint - Retrieve user memory
 * If language parameter is provided, returns specific language preferences
 * If language is omitted, returns all language preferences
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const language = searchParams.get('language');

    // Validate required parameters
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: userId' },
        { status: 400 }
      );
    }

    // Set timeout for database query (5 seconds)
    const timeoutMs = 5000;
    const queryPromise = (async () => {
      const db = await connectToDatabase();
      const userMemoryCollection = db.collection<UserMemory>('user_memory');
      return await userMemoryCollection.findOne({ userId });
    })();

    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), timeoutMs)
    );

    const userMemory = await Promise.race([queryPromise, timeoutPromise]);

    // If no memory found or query timed out
    if (!userMemory) {
      return NextResponse.json({
        success: true,
        memory: null,
        message: 'No memory found for this user'
      });
    }

    // If language is specified, return only that language's preferences
    if (language) {
      const languagePair = `English-${language}`;
      const preferences = userMemory.preferences[languagePair];

      if (!preferences) {
        return NextResponse.json({
          success: true,
          memory: null,
          message: 'No preferences found for this language pair'
        });
      }

      // Return specific language memory data
      return NextResponse.json({
        success: true,
        memory: {
          userId: userMemory.userId,
          preferences: {
            formality: preferences.formality,
            directness: preferences.directness,
            interactionCount: preferences.interactionCount,
            lastUpdated: preferences.lastUpdated
          },
          evolution: userMemory.evolution || []
        }
      });
    }

    // If no language specified, return all preferences
    return NextResponse.json({
      success: true,
      memory: {
        userId: userMemory.userId,
        preferences: userMemory.preferences,
        feedbackStats: userMemory.feedbackStats,
        evolution: userMemory.evolution || []
      }
    });

  } catch (error) {
    console.error('Memory retrieval error:', error);

    const errorMessage = error instanceof Error
      ? error.message
      : 'Unknown error occurred';

    // Provide user-friendly error messages
    let userMessage = 'Failed to retrieve user memory';
    if (errorMessage.includes('connection') || errorMessage.includes('ECONNREFUSED')) {
      userMessage = 'Unable to connect to database. Please try again later.';
    } else if (errorMessage.includes('timeout')) {
      userMessage = 'Database query timed out. Please try again.';
    }

    return NextResponse.json(
      {
        success: false,
        error: userMessage,
        memory: null
      },
      { status: 500 }
    );
  }
}

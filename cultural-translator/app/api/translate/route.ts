import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { LegacyTranslationRequest, LegacyTranslationResponse, Translation } from '@/lib/types';

/**
 * Retry function with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Call Fireworks AI with timeout
 */
async function callFireworksAI(
  text: string,
  sourceCulture: string,
  targetCulture: string,
  context?: string,
  timeoutMs: number = 30000
): Promise<string> {
  if (!process.env.FIREWORKS_API_KEY) {
    throw new Error('FIREWORKS_API_KEY is not configured. Please add it to your .env.local file.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const fireworksResponse = await fetch(
      'https://api.fireworks.ai/inference/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.FIREWORKS_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'accounts/fireworks/models/llama-v3p1-70b-instruct',
          messages: [
            {
              role: 'system',
              content: `You are a cultural translator. Translate text from ${sourceCulture} culture to ${targetCulture} culture, preserving meaning while adapting cultural references, idioms, and context appropriately. ${context ? `Additional context: ${context}` : ''}`,
            },
            {
              role: 'user',
              content: text,
            },
          ],
          max_tokens: 1000,
          temperature: 0.7,
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!fireworksResponse.ok) {
      const errorText = await fireworksResponse.text().catch(() => 'Unknown error');
      throw new Error(`Fireworks AI returned status ${fireworksResponse.status}: ${errorText}`);
    }

    const fireworksData = await fireworksResponse.json();
    const translatedText = fireworksData.choices[0]?.message?.content?.trim() || '';

    if (!translatedText) {
      throw new Error('Fireworks AI returned empty translation');
    }

    return translatedText;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Translation request timed out. Please try again with shorter text.');
      }
      throw error;
    }
    throw new Error('Failed to communicate with translation service');
  }
}

/**
 * Save translation to MongoDB with timeout
 */
async function saveTranslation(
  translation: Translation,
  timeoutMs: number = 5000
): Promise<void> {
  const savePromise = (async () => {
    const client = await clientPromise;
    const db = client.db('cultural-translator');
    const collection = db.collection<Translation>('translations');
    await collection.insertOne(translation);
  })();

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Database save timeout')), timeoutMs)
  );

  await Promise.race([savePromise, timeoutPromise]);
}

export async function POST(request: NextRequest) {
  try {
    // Validate and parse request body
    const body: LegacyTranslationRequest = await request.json();
    const { text, sourceCulture, targetCulture, context } = body;

    // Input validation
    if (!text || !sourceCulture || !targetCulture) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: text, sourceCulture, and targetCulture are required' },
        { status: 400 }
      );
    }

    if (text.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Text must be at least 2 characters long' },
        { status: 400 }
      );
    }

    if (text.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Text exceeds maximum length of 500 characters' },
        { status: 400 }
      );
    }

    // Call Fireworks AI with retry logic
    const translatedText = await retryWithBackoff(
      () => callFireworksAI(text, sourceCulture, targetCulture, context),
      2, // max 2 retries
      1000 // 1 second base delay
    );

    // Try to save to database, but don't fail the request if it fails
    const translation: Translation = {
      originalText: text,
      translatedText,
      sourceCulture,
      targetCulture,
      context,
      timestamp: new Date(),
    };

    try {
      await saveTranslation(translation);
    } catch (dbError) {
      console.error('Database save error (non-critical):', dbError);
      // Continue - translation succeeded even if saving failed
    }

    const response: LegacyTranslationResponse = {
      success: true,
      translatedText,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Translation endpoint error:', error);

    const errorMessage = error instanceof Error
      ? error.message
      : 'An unexpected error occurred during translation';

    // Provide user-friendly error messages
    let userMessage = errorMessage;
    if (errorMessage.includes('FIREWORKS_API_KEY')) {
      userMessage = 'Translation service is not configured. Please contact support.';
    } else if (errorMessage.includes('timeout')) {
      userMessage = 'Translation request timed out. Please try again with shorter text.';
    } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      userMessage = 'Unable to connect to translation service. Please check your internet connection.';
    } else if (errorMessage.includes('status 429')) {
      userMessage = 'Translation service is busy. Please try again in a moment.';
    } else if (errorMessage.includes('status 5')) {
      userMessage = 'Translation service is temporarily unavailable. Please try again later.';
    }

    return NextResponse.json(
      { success: false, error: userMessage },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Set timeout for database query
    const timeoutMs = 5000;
    const queryPromise = (async () => {
      const client = await clientPromise;
      const db = client.db('cultural-translator');
      const collection = db.collection<Translation>('translations');

      const translations = await collection
        .find({})
        .sort({ timestamp: -1 })
        .limit(50)
        .toArray();

      return translations;
    })();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Database query timeout')), timeoutMs)
    );

    const translations = await Promise.race([queryPromise, timeoutPromise]);

    return NextResponse.json({ success: true, translations });
  } catch (error) {
    console.error('Error fetching translations:', error);

    const errorMessage = error instanceof Error
      ? error.message
      : 'Unknown error';

    let userMessage = 'Failed to fetch translation history';
    if (errorMessage.includes('timeout')) {
      userMessage = 'Database query timed out. Please try again.';
    } else if (errorMessage.includes('connection')) {
      userMessage = 'Unable to connect to database. Please try again later.';
    }

    return NextResponse.json(
      { success: false, error: userMessage },
      { status: 500 }
    );
  }
}

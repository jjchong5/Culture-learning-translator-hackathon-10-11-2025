import { NextRequest, NextResponse } from 'next/server';
import { Db } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';
import {
  TranslationRequest,
  TranslationResponse,
  UserMemory,
  AgentLog
} from '@/lib/types';

// Types for internal processing
interface AnalysisResult {
  tone: 'formal' | 'casual' | 'neutral';
  context: 'business' | 'personal' | 'technical' | 'general';
  sentiment: 'positive' | 'negative' | 'neutral';
  hasIdioms: boolean;
}

interface MemoryResult {
  found: boolean;
  formality: number;
  directness: number;
  interactionCount: number;
}

/**
 * STEP 1: ANALYZE - Detect tone, context, and sentiment
 */
async function analyzeText(text: string): Promise<{ analysis: AnalysisResult; reasoning: string }> {
  try {
    // Simple heuristic-based analysis (can be enhanced with ML models)
    const lowerText = text.toLowerCase();

    // Tone detection
    const formalIndicators = ['please', 'kindly', 'would you', 'could you', 'sir', 'madam', 'regards'];
    const casualIndicators = ['hey', 'yeah', 'gonna', 'wanna', 'cool', 'awesome', 'lol'];

    const formalScore = formalIndicators.filter(word => lowerText.includes(word)).length;
    const casualScore = casualIndicators.filter(word => lowerText.includes(word)).length;

    let tone: AnalysisResult['tone'] = 'neutral';
    if (formalScore > casualScore) tone = 'formal';
    else if (casualScore > formalScore) tone = 'casual';

    // Context detection
    const businessWords = ['meeting', 'contract', 'proposal', 'client', 'deadline', 'project'];
    const technicalWords = ['code', 'algorithm', 'function', 'database', 'api', 'server'];
    const personalWords = ['friend', 'family', 'love', 'feel', 'think', 'believe'];

    const businessScore = businessWords.filter(word => lowerText.includes(word)).length;
    const technicalScore = technicalWords.filter(word => lowerText.includes(word)).length;
    const personalScore = personalWords.filter(word => lowerText.includes(word)).length;

    let context: AnalysisResult['context'] = 'general';
    const maxScore = Math.max(businessScore, technicalScore, personalScore);
    if (maxScore > 0) {
      if (businessScore === maxScore) context = 'business';
      else if (technicalScore === maxScore) context = 'technical';
      else if (personalScore === maxScore) context = 'personal';
    }

    // Sentiment detection
    const positiveWords = ['happy', 'great', 'excellent', 'wonderful', 'love', 'amazing', 'good'];
    const negativeWords = ['sad', 'bad', 'terrible', 'awful', 'hate', 'horrible', 'poor'];

    const positiveScore = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeScore = negativeWords.filter(word => lowerText.includes(word)).length;

    let sentiment: AnalysisResult['sentiment'] = 'neutral';
    if (positiveScore > negativeScore) sentiment = 'positive';
    else if (negativeScore > positiveScore) sentiment = 'negative';

    // Idiom detection (simple check for common patterns)
    const idiomPatterns = ['piece of cake', 'break the ice', 'hit the nail', 'under the weather', 'break a leg'];
    const hasIdioms = idiomPatterns.some(idiom => lowerText.includes(idiom));

    const analysis: AnalysisResult = {
      tone,
      context,
      sentiment,
      hasIdioms
    };

    const reasoning = `Detected: ${tone} tone, ${context} context, ${sentiment} sentiment${hasIdioms ? ', contains idioms' : ''}`;

    return { analysis, reasoning };
  } catch (error) {
    console.error('Analysis error:', error);
    // Return neutral defaults on error
    return {
      analysis: {
        tone: 'neutral',
        context: 'general',
        sentiment: 'neutral',
        hasIdioms: false
      },
      reasoning: 'Analysis: Using neutral defaults due to detection error'
    };
  }
}

/**
 * STEP 2: RECALL MEMORY - Query user preferences from MongoDB (with graceful degradation)
 */
async function recallMemory(
  userId: string,
  targetLang: string
): Promise<{ memory: MemoryResult; reasoning: string }> {
  try {
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

    if (!userMemory) {
      return {
        memory: {
          found: false,
          formality: 0.5,
          directness: 0.5,
          interactionCount: 0
        },
        reasoning: 'Memory: No previous interactions found - using contextual inference'
      };
    }

    // Get language pair preferences (e.g., "en->es")
    const languagePair = `*->${targetLang}`;
    const preferences = userMemory.preferences[languagePair] || userMemory.preferences['*->*'];

    if (!preferences) {
      return {
        memory: {
          found: false,
          formality: 0.5,
          directness: 0.5,
          interactionCount: 0
        },
        reasoning: 'Memory: No preferences for this language pair - using defaults'
      };
    }

    const confidence = Math.min(100, 50 + (preferences.interactionCount * 5));
    const formalityPercent = Math.round(preferences.formality * 100);
    const directnessPercent = Math.round(preferences.directness * 100);

    return {
      memory: {
        found: true,
        formality: preferences.formality,
        directness: preferences.directness,
        interactionCount: preferences.interactionCount
      },
      reasoning: `Memory: User prefers ${formalityPercent}% formality, ${directnessPercent}% directness (${preferences.interactionCount} interactions, ${confidence}% confidence)`
    };
  } catch (error) {
    console.error('Memory recall error (graceful degradation):', error);
    // Graceful degradation - don't fail the request if memory retrieval fails
    return {
      memory: {
        found: false,
        formality: 0.5,
        directness: 0.5,
        interactionCount: 0
      },
      reasoning: 'Memory: Database unavailable - proceeding with contextual inference'
    };
  }
}

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
 * STEP 3: ADAPT & TRANSLATE - Use Fireworks AI with cultural adaptation
 */
async function adaptAndTranslate(
  text: string,
  targetLang: string,
  analysis: AnalysisResult,
  memory: MemoryResult
): Promise<{ translation: string; reasoning: string }> {
  try {
    if (!process.env.FIREWORKS_API_KEY) {
      throw new Error('FIREWORKS_API_KEY is not configured. Please add it to your .env.local file.');
    }

    // Build adaptive prompt based on analysis and memory
    const formalityLevel = memory.found
      ? memory.formality > 0.6 ? 'formal' : memory.formality < 0.4 ? 'casual' : 'balanced'
      : analysis.tone === 'formal' ? 'formal' : analysis.tone === 'casual' ? 'casual' : 'balanced';

    const directnessLevel = memory.found
      ? memory.directness > 0.6 ? 'direct' : memory.directness < 0.4 ? 'indirect' : 'moderate'
      : 'moderate';

    const systemPrompt = `You are a culturally-aware translation agent. Translate the following text to ${targetLang} with these adaptations:

CULTURAL CONTEXT:
- Original tone: ${analysis.tone}
- Context: ${analysis.context}
- Sentiment: ${analysis.sentiment}
- Target formality: ${formalityLevel}
- Target directness: ${directnessLevel}

INSTRUCTIONS:
1. Translate accurately while preserving meaning
2. Adapt idioms and cultural references for ${targetLang} speakers
3. Adjust formality level to match user preferences
4. Maintain the sentiment and intent
5. If technical terms exist, keep them or provide ${targetLang} equivalents
6. Ensure natural flow in ${targetLang}

Provide ONLY the translation, no explanations.`;

    // Use retry with backoff for API call
    const translation = await retryWithBackoff(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const response = await fetch(
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
                  content: systemPrompt,
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

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          if (response.status === 429) {
            throw new Error('Translation service rate limit exceeded. Please wait a moment and try again.');
          }
          if (response.status >= 500) {
            throw new Error('Translation service is temporarily unavailable. Please try again.');
          }
          throw new Error(`Translation service error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const translationText = data.choices[0]?.message?.content?.trim() || '';

        if (!translationText) {
          throw new Error('Translation service returned empty response');
        }

        return translationText;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Translation request timed out after 30 seconds. Please try with shorter text.');
        }
        throw error;
      }
    }, 2, 1000); // Max 2 retries with 1s base delay

    const adaptations: string[] = [];
    if (formalityLevel !== 'balanced') adaptations.push(`${formalityLevel} formality`);
    if (directnessLevel !== 'moderate') adaptations.push(`${directnessLevel} communication style`);
    if (analysis.hasIdioms) adaptations.push('idiom localization');
    if (analysis.context !== 'general') adaptations.push(`${analysis.context} terminology`);

    const reasoning = adaptations.length > 0
      ? `Applied: ${adaptations.join(', ')}`
      : 'Applied: Standard translation with cultural awareness';

    return { translation, reasoning };
  } catch (error) {
    console.error('Translation error:', error);
    throw new Error(
      `Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Calculate confidence score based on memory and analysis
 */
function calculateConfidence(memory: MemoryResult, analysis: AnalysisResult): number {
  let confidence = 0.5; // Base confidence

  // Increase confidence if we have memory
  if (memory.found) {
    confidence += 0.2;

    // Add confidence based on interaction count (max +0.3)
    const interactionBonus = Math.min(0.3, (memory.interactionCount / 5) * 0.1);
    confidence += interactionBonus;
  }

  // Decrease confidence if idioms detected
  if (analysis.hasIdioms) {
    confidence -= 0.2;
  }

  // Ensure confidence is between 0 and 1
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Save interaction to MongoDB collections
 */
async function saveToDatabase(
  userId: string,
  originalText: string,
  translation: string,
  targetLang: string,
  reasoning: string[],
  confidence: number,
  analysis: AnalysisResult,
  memory: MemoryResult
): Promise<string> {
  try {
    const db = await connectToDatabase();
    const timestamp = new Date();

    // Save to messages collection
    const messagesCollection = db.collection('messages');
    const messageResult = await messagesCollection.insertOne({
      userId,
      timestamp,
      originalText,
      translation,
      targetLang,
      reasoning,
      confidence,
      analysis,
    });

    // Save to agent_logs collection
    const agentLog: AgentLog = {
      userId,
      timestamp,
      originalText,
      translation,
      reasoning,
      confidence,
    };
    const agentLogsCollection = db.collection<AgentLog>('agent_logs');
    await agentLogsCollection.insertOne(agentLog);

    // Update user_memory collection
    await updateUserMemory(
      db,
      userId,
      targetLang,
      analysis,
      memory
    );

    // Return the message ID for feedback purposes
    return messageResult.insertedId.toString();
  } catch (error) {
    console.error('Database save error:', error);
    throw new Error('Failed to save translation to database');
  }
}

/**
 * Update user memory with learned preferences
 */
async function updateUserMemory(
  db: Db,
  userId: string,
  targetLang: string,
  analysis: AnalysisResult,
  memory: MemoryResult
): Promise<void> {
  try {
    const userMemoryCollection = db.collection<UserMemory>('user_memory');
    const languagePair = `*->${targetLang}`;
    const timestamp = new Date();

    // Convert analysis to numeric values
    const detectedFormality = analysis.tone === 'formal' ? 0.8 : analysis.tone === 'casual' ? 0.2 : 0.5;
    const detectedDirectness = analysis.context === 'business' ? 0.7 : 0.5;

    if (!memory.found) {
      // Initialize new user memory
      const newMemory: UserMemory = {
        userId,
        preferences: {
          [languagePair]: {
            formality: detectedFormality,
            directness: detectedDirectness,
            interactionCount: 1,
            lastUpdated: timestamp,
          },
        },
        evolution: [
          {
            timestamp,
            formality: detectedFormality,
            directness: detectedDirectness,
          },
        ],
      };

      await userMemoryCollection.insertOne(newMemory);
    } else {
      // Update existing memory with weighted average (90% old, 10% new)
      const newFormality = memory.formality * 0.9 + detectedFormality * 0.1;
      const newDirectness = memory.directness * 0.9 + detectedDirectness * 0.1;

      await userMemoryCollection.updateOne(
        { userId },
        {
          $set: {
            [`preferences.${languagePair}.formality`]: newFormality,
            [`preferences.${languagePair}.directness`]: newDirectness,
            [`preferences.${languagePair}.lastUpdated`]: timestamp,
          },
          $inc: {
            [`preferences.${languagePair}.interactionCount`]: 1,
          },
          $push: {
            evolution: {
              timestamp,
              formality: newFormality,
              directness: newDirectness,
            },
          },
        },
        { upsert: true }
      );
    }
  } catch (error) {
    console.error('Memory update error:', error);
    // Don't throw - memory update failure shouldn't fail the whole request
  }
}

/**
 * POST endpoint - Agent-based translation with multi-step reasoning
 */
export async function POST(request: NextRequest) {
  const reasoning: string[] = [];

  try {
    // Parse and validate request
    const body: TranslationRequest = await request.json();
    const { text, targetLang, userId } = body;

    // Validate required fields
    if (!text || !targetLang || !userId) {
      return NextResponse.json(
        {
          error: 'Missing required fields: text, targetLang, and userId are required',
          translation: '',
          reasoning: ['Validation failed: Missing required fields'],
          confidence: 0,
          memoryUsed: false
        },
        { status: 400 }
      );
    }

    // Validate text length
    if (text.trim().length < 2) {
      return NextResponse.json(
        {
          error: 'Text must be at least 2 characters long',
          translation: '',
          reasoning: ['Validation failed: Text too short'],
          confidence: 0,
          memoryUsed: false
        },
        { status: 400 }
      );
    }

    if (text.length > 500) {
      return NextResponse.json(
        {
          error: 'Text exceeds maximum length of 500 characters. Please shorten your text and try again.',
          translation: '',
          reasoning: ['Validation failed: Text too long'],
          confidence: 0,
          memoryUsed: false
        },
        { status: 400 }
      );
    }

    // Validate target language
    const validLanguages = ['Spanish', 'Japanese', 'French', 'German', 'Chinese', 'Korean'];
    if (!validLanguages.includes(targetLang)) {
      return NextResponse.json(
        {
          error: `Invalid target language: ${targetLang}. Supported languages: ${validLanguages.join(', ')}`,
          translation: '',
          reasoning: ['Validation failed: Invalid language'],
          confidence: 0,
          memoryUsed: false
        },
        { status: 400 }
      );
    }

    // STEP 1: ANALYZE
    const { analysis, reasoning: analysisReasoning } = await analyzeText(text);
    reasoning.push(analysisReasoning);

    // STEP 2: RECALL MEMORY
    const { memory, reasoning: memoryReasoning } = await recallMemory(userId, targetLang);
    reasoning.push(memoryReasoning);

    // STEP 3: ADAPT & TRANSLATE
    const { translation, reasoning: translationReasoning } = await adaptAndTranslate(
      text,
      targetLang,
      analysis,
      memory
    );
    reasoning.push(translationReasoning);

    // Calculate confidence
    const confidence = calculateConfidence(memory, analysis);

    // Save to database and get messageId for feedback
    let messageId: string | undefined;
    try {
      messageId = await saveToDatabase(
        userId,
        text,
        translation,
        targetLang,
        reasoning,
        confidence,
        analysis,
        memory
      );
    } catch (dbError) {
      console.error('Database save failed (non-critical):', dbError);
      // Continue without messageId - translation succeeded even if save failed
    }

    // Return response
    const response: TranslationResponse = {
      translation,
      reasoning,
      confidence,
      memoryUsed: memory.found,
      messageId,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Translation endpoint error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    // Provide user-friendly error messages
    let userMessage = errorMessage;
    if (errorMessage.includes('FIREWORKS_API_KEY')) {
      userMessage = 'Translation service is not properly configured. Please contact support.';
    } else if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
      userMessage = 'Translation request took too long. Please try with shorter or simpler text.';
    } else if (errorMessage.includes('rate limit')) {
      userMessage = 'Too many requests. Please wait a moment and try again.';
    } else if (errorMessage.includes('temporarily unavailable') || errorMessage.includes('status 5')) {
      userMessage = 'Translation service is temporarily unavailable. Please try again in a few moments.';
    } else if (errorMessage.includes('network') || errorMessage.includes('fetch failed')) {
      userMessage = 'Network error. Please check your connection and try again.';
    } else if (errorMessage.includes('connection') || errorMessage.includes('ECONNREFUSED')) {
      userMessage = 'Unable to connect to required services. Please try again later.';
    }

    return NextResponse.json(
      {
        error: userMessage,
        translation: '',
        reasoning: reasoning.length > 0 ? reasoning : ['Error occurred before reasoning could begin'],
        confidence: 0,
        memoryUsed: false,
      },
      { status: 500 }
    );
  }
}

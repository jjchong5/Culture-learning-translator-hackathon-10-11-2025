import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { LegacyTranslationRequest, LegacyTranslationResponse, Translation } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body: LegacyTranslationRequest = await request.json();
    const { text, sourceCulture, targetCulture, context } = body;

    if (!text || !sourceCulture || !targetCulture) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Call Fireworks AI API for translation
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
      }
    );

    if (!fireworksResponse.ok) {
      throw new Error('Fireworks AI API request failed');
    }

    const fireworksData = await fireworksResponse.json();
    const translatedText = fireworksData.choices[0]?.message?.content || '';

    // Store translation in MongoDB
    const client = await clientPromise;
    const db = client.db('cultural-translator');
    const collection = db.collection<Translation>('translations');

    const translation: Translation = {
      originalText: text,
      translatedText,
      sourceCulture,
      targetCulture,
      context,
      timestamp: new Date(),
    };

    await collection.insertOne(translation);

    const response: LegacyTranslationResponse = {
      success: true,
      translatedText,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { success: false, error: 'Translation failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('cultural-translator');
    const collection = db.collection<Translation>('translations');

    const translations = await collection
      .find({})
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({ success: true, translations });
  } catch (error) {
    console.error('Error fetching translations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch translations' },
      { status: 500 }
    );
  }
}

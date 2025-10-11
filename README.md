# 🌍 Cultural Translator - Agentic Memory System with Semantic Search

Live demo of an AI agent that learns your cultural communication preferences using semantic search and vector embeddings.

## 🧠 Agentic Features
- **Multi-step reasoning** (visible to user)
- **Semantic search** - Finds similar past translations by meaning
- **Vector embeddings** - Fireworks AI nomic-embed-text-v1.5 (768d)
- **Real-time memory evolution** - Learns from every interaction
- **Active learning from feedback** - Adapts to your preferences
- **Confidence-aware translations** - Shows uncertainty when needed

## 🛠️ Tech Stack
Next.js 14 | Fireworks AI (Translation + Embeddings) | MongoDB Atlas Vector Search | TypeScript | Tailwind

## 🚀 Quick Start
1. `npm install`
2. Copy `.env.example` to `.env.local`
3. Add your API keys:
   - `MONGODB_URI` - MongoDB Atlas connection string
   - `FIREWORKS_API_KEY` - For AI translation AND semantic search embeddings (one key for both!)
4. Set up MongoDB Vector Search index (see [SEMANTIC_SEARCH_SETUP.md](cultural-translator/SEMANTIC_SEARCH_SETUP.md))
5. `npm run dev`

## 📸 Screenshots
[Insert 3-4 screenshots showing reasoning, memory, dashboard]

## 🎯 What Makes It Agentic?
Unlike traditional translation APIs, our agent:
- **Shows transparent reasoning** - See exactly how it thinks
- **Uses semantic search** - Finds similar translations by meaning, not keywords
- **Builds episodic memory** - Remembers your preferences over time
- **Adapts behavior based on feedback** - Learns from corrections
- **Knows when it's uncertain** - Shows confidence scores
- **Learns from context** - Uses similar past translations for consistency

## 🔍 Semantic Search Features
- **Vector Embeddings**: Text converted to 768-dimensional vectors using Fireworks AI (nomic-embed-text-v1.5)
- **Similarity Search**: Finds translations with similar meaning (cosine similarity)
- **Context Learning**: Learns tone and style from past similar translations
- **Cross-lingual**: Works across all supported languages
- **Single API Key**: Uses your existing FIREWORKS_API_KEY for both translation and embeddings
- **Graceful Degradation**: Falls back to keyword analysis if embeddings unavailable

### How It Works:
1. **First translation**: "How are you?" → Analyzed, translated, embedding stored
2. **Later translation**: "How's it going?" → Semantic search finds similar "How are you?"
3. **Agent learns**: Uses same tone/style as previous similar translation
4. **Result**: Consistent translations across semantically similar phrases

## 📊 Agent Reasoning Steps

The agent follows a 4-step process for each translation:

1. **ANALYZE** - Detect tone, context, sentiment, idioms
2. **SEMANTIC SEARCH** ⭐ - Find similar past translations by meaning
3. **RECALL MEMORY** - Query user preferences from history
4. **ADAPT & TRANSLATE** - Generate culturally-aware translation with context
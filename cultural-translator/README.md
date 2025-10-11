# Cultural Translator

A Next.js 14 application that translates text across cultures while preserving context and meaning, powered by Fireworks AI.

## Project Structure

```
cultural-translator/
├── app/
│   ├── api/
│   │   └── translate/
│   │       └── route.ts          # Translation API endpoint
│   ├── dashboard/
│   │   └── page.tsx               # Main dashboard page
│   ├── layout.tsx
│   └── page.tsx                   # Home page (redirects to dashboard)
├── components/
│   └── TranslationInterface.tsx   # Translation UI component
├── lib/
│   ├── mongodb.ts                 # MongoDB connection
│   └── types.ts                   # TypeScript type definitions
├── .env.local                     # Environment variables (not in git)
└── .env.example                   # Environment variables template
```

## Features

- Cultural translation using Fireworks AI
- MongoDB integration for storing translations
- TypeScript for type safety
- Tailwind CSS with custom color scheme
- App Router architecture (Next.js 14)

## Setup

1. Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

2. Update `.env.local` with your credentials:

```env
MONGODB_URI=your_mongodb_connection_string
FIREWORKS_API_KEY=your_fireworks_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. Install dependencies:

```bash
npm install
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Custom Colors

The project uses a custom Tailwind color scheme:

- Primary: #6366f1 (Indigo)
- Secondary: #8b5cf6 (Purple)
- Accent: #ec4899 (Pink)

## API Endpoints

### POST /api/translate
Translates text from one culture to another.

Request body:
```json
{
  "text": "Hello, how are you?",
  "sourceCulture": "American",
  "targetCulture": "Japanese",
  "context": "casual conversation"
}
```

### GET /api/translate
Retrieves the last 50 translations from the database.

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- MongoDB
- Fireworks AI
- Tailwind CSS

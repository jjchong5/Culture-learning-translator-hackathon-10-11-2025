import type { Metadata } from 'next';
import Link from 'next/link';
import TranslationInterface from '@/components/TranslationInterface';

export const metadata: Metadata = {
  title: 'Cultural Translator - Agentic AI',
  description: 'An AI agent that learns and adapts to your cultural communication preferences',
};

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl font-bold mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Cultural Translator
          </h1>
          <p className="text-xl sm:text-2xl text-gray-700 mb-6">
            AI Agent That Learns Your Communication Style
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            Go to Dashboard →
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 pb-12">
        <div className="max-w-7xl mx-auto">
          <TranslationInterface />
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 bg-white/50 backdrop-blur-sm border-t border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Tech Stack Badges */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="px-4 py-2 bg-black text-white rounded-full text-sm font-medium shadow-md">
                Next.js 14
              </span>
              <span className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full text-sm font-medium shadow-md">
                Fireworks AI
              </span>
              <span className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-full text-sm font-medium shadow-md">
                MongoDB
              </span>
            </div>

            {/* GitHub Link Placeholder */}
            <div className="flex items-center gap-2">
              <a
                href="https://github.com/yourusername/cultural-translator"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors duration-200"
              >
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-medium">GitHub</span>
              </a>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>&copy; {new Date().getFullYear()} Cultural Translator. Powered by AI.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

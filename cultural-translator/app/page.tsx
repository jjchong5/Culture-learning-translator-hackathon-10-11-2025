'use client';

import { useState } from 'react';
import Link from 'next/link';
import TranslationInterface from '@/components/TranslationInterface';
import DemoScenarios from '@/components/DemoScenarios';

export default function Home() {
  const [scenarioText, setScenarioText] = useState<string>('');
  const [scenarioLang, setScenarioLang] = useState<string>('');
  const [scenarioTrigger, setScenarioTrigger] = useState<number>(0);

  const handleScenarioSelect = (text: string, targetLang: string) => {
    setScenarioText(text);
    setScenarioLang(targetLang);
    setScenarioTrigger(prev => prev + 1);

    // Scroll to translation interface
    setTimeout(() => {
      const translationSection = document.getElementById('translation-interface');
      if (translationSection) {
        translationSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
            Cultural Translator
          </h1>
          <p className="text-xl sm:text-2xl text-purple-200 mb-6">
            AI Agent That Learns Your Communication Style
          </p>

          {/* Feature Badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            <span className="px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-full text-sm font-medium shadow-md border border-white/20">
              🧠 Agentic Reasoning
            </span>
            <span className="px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-full text-sm font-medium shadow-md border border-white/20">
              📚 Memory & Learning
            </span>
            <span className="px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-full text-sm font-medium shadow-md border border-white/20">
              🌍 Cultural Adaptation
            </span>
          </div>

          <Link
            href="/dashboard"
            className="inline-block px-6 py-3 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-lg shadow-lg hover:shadow-xl hover:bg-white/20 transition-all duration-300 hover:scale-105 border border-white/20"
          >
            Go to Dashboard →
          </Link>
        </div>
      </header>

      {/* Demo Scenarios Section */}
      <section className="px-4 sm:px-6 lg:px-8 pb-12">
        <div className="max-w-7xl mx-auto">
          <DemoScenarios onScenarioSelect={handleScenarioSelect} />
        </div>
      </section>

      {/* Main Content */}
      <main id="translation-interface" className="flex-1 px-4 sm:px-6 lg:px-8 pb-12">
        <div className="max-w-7xl mx-auto">
          <TranslationInterface
            initialText={scenarioText}
            initialLang={scenarioLang}
            scenarioTrigger={scenarioTrigger}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 bg-white/5 backdrop-blur-sm border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Tech Stack Badges */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="px-4 py-2 bg-white/10 text-white rounded-full text-sm font-medium shadow-md border border-white/20">
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
                className="flex items-center gap-2 px-4 py-2 text-purple-200 hover:text-white transition-colors duration-200"
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
          <div className="mt-6 text-center text-sm text-purple-300">
            <p>&copy; {new Date().getFullYear()} Cultural Translator. Powered by AI.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

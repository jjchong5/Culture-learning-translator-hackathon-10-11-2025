'use client';

import { useState } from 'react';

export interface Scenario {
  id: string;
  emoji: string;
  title: string;
  description: string;
  text: string;
  targetLang: string;
  culturalContext: string;
  expectedFormality: 'high' | 'medium' | 'low';
}

const SCENARIOS: Scenario[] = [
  {
    id: 'business-japanese',
    emoji: '🤝',
    title: 'Business Email to Japanese Client',
    description: 'Formal business communication requiring high cultural awareness',
    text: 'I need to schedule a professional meeting with our international clients to discuss the quarterly business report and upcoming proposals.',
    targetLang: 'Japanese',
    culturalContext: 'Japanese business culture values formal language (keigo) and indirect communication',
    expectedFormality: 'high',
  },
  {
    id: 'feedback-german',
    emoji: '💼',
    title: 'Feedback to German Colleague',
    description: 'Direct professional feedback respecting German communication style',
    text: 'Your presentation was good, but I think we need to focus more on the data analysis section. Could you please revise it by tomorrow?',
    targetLang: 'German',
    culturalContext: 'German culture appreciates directness and clarity in professional settings',
    expectedFormality: 'medium',
  },
  {
    id: 'social-indian',
    emoji: '🎉',
    title: 'Social Invitation to Indian Friend',
    description: 'Warm, friendly invitation with cultural warmth',
    text: 'Hey! We\'re throwing a small celebration at our place this Saturday evening. Would love for you and your family to join us for dinner!',
    targetLang: 'Spanish',
    culturalContext: 'Social invitations often include family and emphasize warmth and hospitality',
    expectedFormality: 'low',
  },
];

interface DemoScenariosProps {
  onScenarioSelect: (text: string, targetLang: string) => void;
}

export default function DemoScenarios({ onScenarioSelect }: DemoScenariosProps) {
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [hoveredScenario, setHoveredScenario] = useState<string | null>(null);

  const handleScenarioClick = (scenario: Scenario) => {
    setSelectedScenario(scenario.id);
    onScenarioSelect(scenario.text, scenario.targetLang);

    // Visual feedback - reset after animation
    setTimeout(() => setSelectedScenario(null), 1000);
  };

  const getFormalityBadgeColor = (formality: 'high' | 'medium' | 'low') => {
    switch (formality) {
      case 'high':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'medium':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'low':
        return 'bg-green-100 text-green-700 border-green-300';
    }
  };

  const getFormalityLabel = (formality: 'high' | 'medium' | 'low') => {
    switch (formality) {
      case 'high':
        return 'Formal';
      case 'medium':
        return 'Professional';
      case 'low':
        return 'Casual';
    }
  };

  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent mb-3">
          Try Interactive Demo Scenarios
        </h2>
        <p className="text-gray-600 text-lg">
          See how the agent adapts to different cultural contexts
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {SCENARIOS.map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => handleScenarioClick(scenario)}
            onMouseEnter={() => setHoveredScenario(scenario.id)}
            onMouseLeave={() => setHoveredScenario(null)}
            className={`group relative p-6 rounded-2xl border-2 transition-all duration-300 text-left ${
              selectedScenario === scenario.id
                ? 'border-purple-500 bg-purple-50 scale-95 shadow-2xl'
                : hoveredScenario === scenario.id
                ? 'border-purple-300 bg-white shadow-xl scale-105 -translate-y-2'
                : 'border-gray-200 bg-white shadow-md hover:shadow-lg'
            }`}
          >
            {/* Emoji Badge */}
            <div className="text-5xl mb-4 transform transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
              {scenario.emoji}
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-purple-600 transition-colors">
              {scenario.title}
            </h3>

            {/* Description */}
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              {scenario.description}
            </p>

            {/* Formality Badge */}
            <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium border-2 mb-4 ${getFormalityBadgeColor(scenario.expectedFormality)}`}>
              {getFormalityLabel(scenario.expectedFormality)} Tone
            </div>

            {/* Preview Text */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500 mb-1 font-medium">Sample Text:</p>
              <p className="text-sm text-gray-700 line-clamp-3 italic">
                "{scenario.text}"
              </p>
            </div>

            {/* Cultural Context (shown on hover) */}
            {hoveredScenario === scenario.id && (
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/95 to-pink-500/95 rounded-2xl p-6 flex flex-col justify-center items-center text-white animate-fadeIn">
                <div className="text-4xl mb-3">{scenario.emoji}</div>
                <p className="text-center text-sm font-medium leading-relaxed">
                  {scenario.culturalContext}
                </p>
                <div className="mt-4 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
                  <p className="text-xs font-bold">Click to try →</p>
                </div>
              </div>
            )}

            {/* Selected Animation */}
            {selectedScenario === scenario.id && (
              <div className="absolute inset-0 bg-gradient-to-br from-green-400/90 to-emerald-500/90 rounded-2xl flex items-center justify-center animate-fadeIn">
                <div className="text-center text-white">
                  <div className="text-6xl mb-2 animate-bounce">✓</div>
                  <p className="text-lg font-bold">Scenario Loaded!</p>
                </div>
              </div>
            )}

            {/* Target Language Flag */}
            <div className="absolute top-4 right-4 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 text-xs font-medium text-gray-700">
              → {scenario.targetLang}
            </div>
          </button>
        ))}
      </div>

      {/* Feature Highlights */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200 text-center">
          <div className="text-3xl mb-2">🧠</div>
          <h4 className="font-bold text-gray-800 mb-1">Agent Learning</h4>
          <p className="text-xs text-gray-600">Watch the AI adapt its reasoning based on cultural context</p>
        </div>
        <div className="p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200 text-center">
          <div className="text-3xl mb-2">🌍</div>
          <h4 className="font-bold text-gray-800 mb-1">Cultural Awareness</h4>
          <p className="text-xs text-gray-600">Translations respect cultural communication norms</p>
        </div>
        <div className="p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200 text-center">
          <div className="text-3xl mb-2">📊</div>
          <h4 className="font-bold text-gray-800 mb-1">Confidence Tracking</h4>
          <p className="text-xs text-gray-600">See real-time confidence scores and reasoning steps</p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}

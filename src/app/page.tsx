import Link from "next/link";

import { ActivityIcon, BrainCircuit, ClipboardList, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Your AI Productivity Assistant
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Schematic helps you stay organized, focused, and productive with
              intelligent task management and personalized assistance.
            </p>
            <div className="flex justify-center gap-4">
              <Link
                href="/bulletin"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow">
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
              <BrainCircuit className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-semibold mb-4">AI-Powered Insights</h2>
            <p className="text-gray-600">
              Get intelligent suggestions and automated task prioritization
              based on your work patterns.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow">
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mb-6">
              <ClipboardList className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold mb-4">Smart Organization</h2>
            <p className="text-gray-600">
              Keep your tasks, notes, and projects organized with intelligent
              categorization.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow">
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
              <Zap className="h-6 w-6 text-purple-600" />
            </div>
            <h2 className="text-2xl font-semibold mb-4">Quick Actions</h2>
            <p className="text-gray-600">
              Accomplish tasks faster with customizable shortcuts and
              automation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

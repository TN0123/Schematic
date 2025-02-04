import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8 text-center">
          Welcome
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quick Access Cards */}
          <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-shadow">
            <h2 className="text-2xl font-semibold mb-4">Bulletin Board</h2>
            <p className="text-gray-600 mb-4">
              Access your notes and important updates
            </p>
            <a href="/bulletin" className="text-blue-500 hover:text-blue-600">
              View Bulletin →
            </a>
          </div>

          {/* Add more feature cards here */}
          <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-shadow">
            <h2 className="text-2xl font-semibold mb-4">Recent Activity</h2>
            <p className="text-gray-600">See your latest notes and changes</p>
          </div>
        </div>
      </div>
    </div>
  );
}

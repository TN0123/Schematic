# Schematic - AI-Powered Productivity Workspace

[![Next.js](https://img.shields.io/badge/Next.js-15.3.3-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.3.1-green)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.1-38B2AC)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Schematic is an intelligent, AI-powered productivity workspace that combines a writing editor, notes app, and calendar app. Built with modern web technologies and enhanced with AI capabilities, Schematic helps you organize your thoughts, manage your time, and boost your productivity.

## ✨ Features

### Writing Editor

- **Integrated AI writing assistant**: Cursor-style UI for everyday writing
- **Dynamic Context Management**: AI automatically manages its own context around your document for relevant recommendations and modifications
- **Generate Synthetic Human-AI Writing Fast**: Built in shortcuts for fast continuations and wording improvements

### Notes App

- **Multiple Note Types**: Text, checklists, tables, and interactive visualizations
- **Interactive Visualizations**:
  - Mind maps for brainstorming
  - Flowcharts for process mapping
  - Tree structures for hierarchical organization
  - Dynamic graphs and charts
- **Drag & Drop Interface**: Intuitive organization with DnD functionality
- **Create Notes with Text Descriptions**: Describe the kind of information that you want to store and an AI will create a custom note template for you. Refactor the format at any time.

### Calendar App

- **Integrated, Personalized AI Assistant**: An AI that has access to relevant context from your notes, documents, goals, and calendar events that helps you be productive
- **Fast Text-Based Event Generation**: Create multiple events at a time with natural language descriptions
- **Goal Tracking**: Daily, weekly, monthly, and yearly goal management
- **Reminder System**: Intelligent reminders with AI-suggested timing
- **File Upload Support**: Import schedules from ICS files, PDFs, and images

### 🌐 Cross-Platform Desktop App (Work in progress)

- **Electron-based**: Native desktop experience across Windows, macOS, and Linux

## 🚀 Tech Stack

### Frontend

- **Next.js 15** - React framework with App Router
- **React 19** - Modern React with concurrent features
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Smooth animations and transitions
- **DnD Kit** - Drag and drop functionality

### Backend & Database

- **Prisma** - Type-safe database ORM
- **PostgreSQL** - Robust relational database
- **NextAuth.js** - Authentication and session management
- **Next.js API Routes** - Serverless API endpoints

### AI & External Services

- **Google Gemini AI** - Advanced AI text generation
- **OpenAI API** - Additional AI capabilities
- **PostHog** - Analytics and user insights

### Desktop & Build

- **Electron** - Cross-platform desktop application
- **Electron Builder** - Application packaging and distribution
- **Auto-updater** - Seamless update system

## 📦 Installation

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Google Gemini API key (for AI features)
- OpenAI API key (optional, for additional AI features)

### Development Setup

1. **Fork the repository on Github, then clone your fork**

   ```bash
   git clone https://github.com/TN0123/Schematic.git
   cd schematic
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Google Cloud Console Setup**

   To enable Google OAuth authentication, you need to configure a Google Cloud project:

   **Step 1: Create a Google Cloud Project**

   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Google+ API (if not already enabled)

   **Step 2: Configure OAuth Consent Screen**

   - Navigate to "APIs & Services" > "OAuth consent screen"
   - Choose "External" user type (unless you have a Google Workspace organization)
   - Fill in the required information:
     - App name: "Schematic"
     - User support email: Your email address
     - Developer contact information: Your email address
   - Add scopes: `email`, `profile`, `openid`
   - Add test users if needed (for development)

   **Step 3: Create OAuth 2.0 Credentials**

   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application" as the application type
   - Add authorized redirect URIs:
     - For development: `http://localhost:3000/api/auth/callback/google`
     - For production: `https://yourdomain.com/api/auth/callback/google`
   - Copy the generated Client ID and Client Secret

   **Step 4: Environment Configuration**
   Create a `.env` file in the root directory:

   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/schematic"
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   GEMINI_API_KEY="your-gemini-api-key"
   OPENAI_API_KEY="your-openai-api-key"
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   ```

   **Note**: Replace `your-google-client-id` and `your-google-client-secret` with the values from Step 3.

4. **Database Setup**

   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run Development Server**

   ```bash
   npm run dev
   ```

   Navigate to http://localhost:3000/ in the browser to test the application

6. **Run Electron Development**
   ```bash
   npm run electron-dev
   ```

### Production Build

```bash
# Build for web
npm run build

# Build desktop application
npm run electron-build

# Package for distribution
npm run dist
```

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── _components/       # Shared components
│   ├── api/              # API routes
│   ├── bulletin/         # Note-taking and visualization
│   ├── schedule/         # Calendar and event management
│   └── write/            # AI-powered writing assistant
├── components/            # Reusable UI components
├── lib/                   # Utility libraries and configurations
├── scripts/               # AI integration scripts
└── types/                 # TypeScript type definitions
```

## 🤝 Contributing

See `CONTRIBUTING.md` to view instructions on the collaborative development process for Schematic

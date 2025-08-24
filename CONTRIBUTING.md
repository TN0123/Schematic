# Contributing to Schematic

Thank you for your interest in contributing to Schematic! This document provides guidelines and information for contributors to help make the contribution process smooth and effective.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Contributing Guidelines](#contributing-guidelines)
- [Code Style and Standards](#code-style-and-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)
- [Feature Requests](#feature-requests)
- [Community](#community)

## Code of Conduct

By participating in this project, you agree to uphold a welcoming, inclusive, and harassment‑free environment for everyone, regardless of age, body size, visible or invisible disability, ethnicity, sex characteristics, gender identity and expression, level of experience, education, socio‑economic status, nationality, personal appearance, race, religion, or sexual identity and orientation. Treat all participants with respect and empathy; be considerate of differing viewpoints; give and gracefully accept constructive feedback; and focus on what is best for the community.

Unacceptable behavior includes harassment or discrimination; trolling, insulting, or derogatory comments; personal or political attacks; unwelcome sexual attention; publishing others’ private information without permission; or other conduct that would be inappropriate in a professional setting. Project maintainers may take any action they deem appropriate to address unacceptable behavior. If you experience or witness a violation, please report it by opening an issue or privately contacting the maintainers through the project's support channels.

## Getting Started

Before you begin contributing, please make sure you have:

- Node.js 18+ installed
- Git installed
- A GitHub account
- Basic knowledge of React, TypeScript, and Next.js

## Development Setup

1. **Fork the repository**

   ```bash
   # Fork the repository on GitHub, then clone your fork
   git clone https://github.com/TN0123/Schematic.git
   cd schematic
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Install VS Code Prettier Extension**
   
   Install the Prettier extension in VS Code to ensure consistent code formatting:
   - Open VS Code
   - Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
   - Search for "Prettier - Code formatter"
   - Install the extension by Prettier
   - Enable "Format on Save" in VS Code settings for automatic formatting

3. **Set up environment variables**
   Create a `.env` file in the root directory:

   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/schematic"
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   GEMINI_API_KEY="your-gemini-api-key"
   OPENAI_API_KEY="your-openai-api-key"
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   POSTHOG_API_KEY="your-posthog-api-key"
   ```

4. **Set up the database**

   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

6. **For Electron development**
   ```bash
   npm run electron-dev
   ```

## Project Structure

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

## Contributing Guidelines

### Types of Contributions

We welcome various types of contributions:

- **Bug fixes**: Fix issues and improve stability
- **Feature development**: Add new features and capabilities
- **Documentation**: Improve README, add examples, fix typos
- **UI/UX improvements**: Enhance the user interface and experience
- **Performance optimizations**: Improve speed and efficiency
- **Testing**: Add tests and improve test coverage
- **Code quality**: Refactor code, improve architecture

### Before You Start

1. **Check existing issues**: Look for existing issues or discussions about your idea
2. **Create an issue**: If no existing issue, create one to discuss your proposed changes
3. **Get feedback**: Wait for maintainer feedback before starting work
4. **Fork and branch**: Create a feature branch from the main branch

### Branch Naming Convention

Use descriptive branch names:

- `feature/descriptive-feature-name`
- `fix/descriptive-bug-fix`

- `refactor/descriptive-refactoring`

## Code Style and Standards

### TypeScript

- Use TypeScript for all new code
- Provide proper type definitions
- Avoid `any` types - use proper typing
- Use interfaces for object shapes
- Prefer `const` over `let` when possible

### React/Next.js

- Use functional components with hooks
- Follow React best practices
- Use Next.js App Router patterns
- Implement proper error boundaries
- Use proper loading states

### Code Formatting

- Use consistent indentation (2 spaces)
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused
- Follow the existing code style in the file

### File Organization

- Group related functionality together
- Use descriptive file names
- Follow the existing directory structure
- Place shared components in appropriate directories

## Testing

### Running Tests

```bash
# Run linting
npm run lint

# Run type checking
npx tsc --noEmit

# Run tests (when available)
npm test
```

### Writing Tests

- Write tests for new features
- Ensure existing tests pass
- Use descriptive test names
- Test both success and error cases
- Mock external dependencies appropriately

## Pull Request Process

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**

   - Write clean, well-documented code
   - Follow the coding standards
   - Add tests if applicable

3. **Commit your changes**

   ```bash
   git add .
   git commit -m "feat: add descriptive commit message"
   ```

4. **Push to your fork**

   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request**
   - Use the PR template if available
   - Provide a clear description of changes
   - Link related issues
   - Include screenshots for UI changes

### Commit Message Format

Use conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:

- `feat`: New feature
- `fix`: Bug fix

- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### PR Review Process

1. **Automated checks**: Ensure all CI checks pass
2. **Code review**: Address feedback from maintainers
3. **Testing**: Verify changes work as expected
4. **Merge**: Maintainers will merge approved PRs

## Reporting Issues

### Bug Reports

When reporting bugs, please include:

- **Clear description**: What happened vs. what you expected
- **Steps to reproduce**: Detailed steps to recreate the issue
- **Environment**: OS, browser, Node.js version
- **Screenshots**: If applicable
- **Console errors**: Any error messages or logs
- **Additional context**: Any relevant information

### Issue Templates

Use the appropriate issue template:

- Bug report
- Feature request

- Security vulnerability

## Feature Requests

When requesting features:

1. **Check existing issues**: Search for similar requests
2. **Provide context**: Explain the problem you're solving
3. **Describe the solution**: How should it work?
4. **Consider alternatives**: Are there existing solutions?
5. **Show examples**: Provide mockups or examples if possible



## Community

### Getting Help

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussion
- **README**: Check the README first

### Communication Guidelines

- Be respectful and inclusive
- Use clear, constructive language
- Provide context when asking questions
- Help others when you can
- Follow the Code of Conduct

## Development Workflow

### Daily Development

1. **Sync with main**: `git pull origin main`
2. **Create feature branch**: `git checkout -b feature/name`
3. **Make changes**: Write code, add tests
4. **Test locally**: Run tests and manual testing
5. **Commit changes**: Use conventional commit format
6. **Push and PR**: Create pull request

## Questions?

If you have questions about contributing reach out to schematicnow@gmail.com

Thank you for contributing to Schematic! Your contributions help make this project better for everyone.

---

**Note**: This document is a living document. If you find any issues or have suggestions for improvement, please submit a pull request or create an issue.

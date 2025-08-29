# Contributing to TN Agent Launcher

Thank you for your interest in contributing to TN Agent Launcher! This guide will help you get started with contributing to the project.

## 🤝 Community Philosophy

Our project is built on the principles of collaboration, quality, and respect. We believe that:

### Guiding Values
- **Attribution Matters**: Everyone gets credit for their work
- **Knowledge Sharing**: Improvements benefit the entire community
- **Quality Focus**: Prioritize well-crafted solutions over quantity
- **Practical Application**: Solutions should address real-world challenges

## 📋 Getting Started

### Prerequisites
- Python 3.12+
- Node.js 18+
- PostgreSQL
- Redis (for WebSocket support)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/thinknimble/tn-agent-launcher.git
   cd tn-agent-launcher
   ```

2. **Set up the backend**
   ```bash
   cd server
   cp .env.example .env
   # Edit .env with your configuration
   
   # Install dependencies
   pip install -e ..
   
   # Run migrations
   python manage.py migrate
   
   # Create a superuser
   python manage.py createsuperuser
   
   # Start the server
   python manage.py runserver
   ```

3. **Set up the frontend**
   ```bash
   cd client
   cp .env.example .env.local
   # Edit .env.local with your configuration
   
   # Install dependencies
   npm install
   
   # Start the development server
   npm run dev
   ```

## 🚀 Ways to Contribute

### 1. Report Issues
- Use the GitHub issue tracker to report bugs
- Provide clear descriptions and steps to reproduce
- Include relevant error messages and screenshots

### 2. Submit Pull Requests
- Fork the repository and create a feature branch
- Write clear, concise commit messages
- Include tests for new functionality
- Update documentation as needed
- Submit a pull request with a clear description

### 3. Improve Documentation
- Fix typos and clarify existing documentation
- Add examples and use cases
- Translate documentation to other languages

### 4. Create or Enhance Agents
- Develop new agent capabilities
- Improve existing agent functionality
- Share real-world use cases

## 📝 Code Standards

### Python (Backend)
- Follow PEP 8 style guidelines
- Use type hints where appropriate
- Write comprehensive tests using pytest
- Run `ruff` for linting before committing

### TypeScript/React (Frontend)
- Follow the existing code style
- Use TypeScript for type safety
- Write tests for components and utilities
- Run `npm run lint` before committing

### Commit Messages
- Use clear, descriptive commit messages
- Start with a verb in the present tense (e.g., "Add", "Fix", "Update")
- Reference issue numbers when applicable

## ✅ Code of Conduct

### Recommended Practices
- ✅ Give credit to others
- ✅ Use respectful language
- ✅ Accept constructive feedback
- ✅ Focus on community benefits
- ✅ Thoroughly test contributions

### Practices to Avoid
- ❌ Include sensitive information
- ❌ Submit untested work
- ❌ Remove others' attribution
- ❌ Use aggressive communication
- ❌ Submit duplicate or low-effort contributions

## 🧪 Testing

### Backend Tests
```bash
cd server
pytest
```

### Frontend Tests
```bash
cd client
npm run test
npm run test:e2e  # For end-to-end tests
```

## 📄 License

By contributing to TN Agent Launcher, you agree that your contributions will be licensed under the Apache License 2.0.

## 🙏 Recognition

We value all contributions to the project. Contributors will be:
- Listed in the project's contributor list
- Credited in release notes for significant contributions
- Acknowledged in the documentation for major features

## 💬 Getting Help

If you need help or have questions:
- Check the existing documentation
- Search through existing issues
- Ask in discussions or create a new issue
- Contact the maintainers

Thank you for contributing to TN Agent Launcher!
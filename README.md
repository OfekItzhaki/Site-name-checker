# Domain Availability Checker

A modern, privacy-focused web application that provides real-time domain availability checking across multiple top-level domains (TLDs). Built with TypeScript and enterprise-level design patterns for scalability and maintainability.

## 🚀 Features

- **Real-time Domain Checking**: Instantly check domain availability across multiple TLDs
- **Multi-TLD Support**: Check .com, .net, .org, .ai, .dev, .io, .co simultaneously
- **Privacy-Focused**: No data persistence or tracking - completely stateless
- **Responsive Design**: Works seamlessly across desktop and mobile devices
- **Hybrid Query Strategy**: Combines DNS lookups for speed with WHOIS queries for accuracy
- **Concurrent Processing**: Parallel domain checks for optimal performance
- **Error Resilience**: Graceful error handling with retry mechanisms
- **Enterprise Architecture**: Built with 6 design patterns for maintainability

## 🏗️ Architecture

The application follows a clean, layered architecture with strict separation of concerns:

### Design Patterns Implemented

- **Observer Pattern**: Event-driven architecture for loose coupling
- **Factory Pattern**: Dynamic service creation and configuration
- **Strategy Pattern**: Multiple query strategies (DNS, WHOIS, Hybrid)
- **Command Pattern**: Encapsulated operations with retry logic
- **State Pattern**: Clean UI state management
- **Repository Pattern**: Data access abstraction

### Layer Structure

```
┌─────────────────────────────────────────┐
│              UI Layer                   │  ← Presentation only
├─────────────────────────────────────────┤
│           Controller Layer              │  ← Orchestration & State
├─────────────────────────────────────────┤
│            Service Layer                │  ← Business Logic
├─────────────────────────────────────────┤
│          Validation Layer               │  ← Input Validation
├─────────────────────────────────────────┤
│            Model Layer                  │  ← Data Structures
└─────────────────────────────────────────┘
```

## 🛠️ Technology Stack

- **Language**: TypeScript (strict mode)
- **Runtime**: Node.js
- **Frontend**: HTML5, CSS3, Vanilla TypeScript
- **Testing**: Jest + fast-check (property-based testing)
- **Build**: TypeScript Compiler (tsc)
- **Architecture**: Clean Architecture with Design Patterns

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/OfekItzhaki/Site-name-checker.git
cd Site-name-checker

# Install dependencies
npm install

# Build the project
npm run build
```

## 🚦 Usage

### Development

```bash
# Start development server
npm run dev

# Watch mode for TypeScript compilation
npm run watch

# Type checking
npm run type-check
```

### Testing

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run property-based tests
npm run test:property

# Run tests with coverage
npm run test:coverage
```

### Production

```bash
# Production build
npm run build

# Lint code
npm run lint
```

## 🎯 How It Works

1. **Input Validation**: Comprehensive domain name validation (RFC compliant)
2. **Strategy Selection**: Chooses optimal query strategy based on domain characteristics
3. **Concurrent Execution**: Parallel checks across all supported TLDs
4. **Result Aggregation**: Combines DNS and WHOIS results for accuracy
5. **Real-time Updates**: Live progress updates with state management

## 🧪 Testing Strategy

The project includes comprehensive testing with:

- **100+ Unit Tests**: Individual component testing
- **Property-Based Tests**: Universal behavior validation with 100+ iterations
- **Integration Tests**: Component interaction testing
- **90%+ Code Coverage**: Ensuring reliability and maintainability

## 📁 Project Structure

```
├── src/
│   ├── controllers/     # Domain controller orchestration
│   ├── services/        # DNS and WHOIS query services
│   ├── validators/      # Input validation logic
│   ├── models/          # TypeScript interfaces and types
│   ├── ui/              # User interface components
│   ├── patterns/        # Design pattern implementations
│   │   ├── observer/    # Event Bus and Observer pattern
│   │   ├── factory/     # Service Factory pattern
│   │   ├── strategy/    # Query Strategy pattern
│   │   ├── command/     # Command pattern for operations
│   │   ├── state/       # State pattern for UI management
│   │   └── repository/  # Repository pattern for data access
│   └── utils/           # Utility functions
├── tests/               # Comprehensive test suite
├── public/              # Static web assets
└── .kiro/               # Project specifications and documentation
```

## 🎨 Key Design Decisions

### Privacy-First Approach
- No data persistence or session storage
- No user tracking or analytics
- Completely stateless operation

### Performance Optimization
- Concurrent domain checking across TLDs
- DNS-first strategy with WHOIS fallback
- Intelligent caching and service reuse
- Error isolation (failed queries don't affect others)

### Enterprise-Grade Architecture
- Strict TypeScript with comprehensive type safety
- Design patterns for maintainability and extensibility
- Comprehensive error handling and retry mechanisms
- Property-based testing for correctness guarantees

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📋 Requirements

- Node.js 16+ 
- TypeScript 5.0+
- Modern web browser with ES2020 support

## 🔧 Configuration

The application supports various configuration options:

- **Query Timeouts**: Configurable per service type
- **Retry Logic**: Exponential backoff with configurable limits
- **TLD Selection**: Easy to add/remove supported TLDs
- **Concurrency Limits**: Adjustable parallel processing limits

## 📊 Performance

- **Average Query Time**: < 2 seconds for all TLDs
- **Concurrent Checks**: Up to 7 TLDs simultaneously
- **Error Recovery**: Automatic retry with exponential backoff
- **Memory Efficient**: Stateless design with minimal footprint

## 🛡️ Security

- Input sanitization and validation
- No data persistence or storage
- Client-side only processing
- No external API dependencies for core functionality

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with enterprise-level design patterns
- Inspired by clean architecture principles
- Comprehensive testing with property-based validation
- Privacy-focused design philosophy

---

**Made with ❤️ for developers who need fast, reliable domain checking**
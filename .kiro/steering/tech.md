# Technology Stack

## Core Technologies
- **Language**: TypeScript for type safety and modern development
- **Runtime**: Node.js for server-side operations
- **Frontend**: HTML5, CSS3, vanilla TypeScript (no framework dependencies)
- **Architecture**: Clean layered architecture with separation of concerns

## Key Libraries and Dependencies
- **DNS Queries**: Node.js built-in `dns` module
- **WHOIS Queries**: `whois` npm package for domain registration lookups
- **Testing Framework**: Jest for unit testing
- **Property-Based Testing**: fast-check for comprehensive test coverage
- **Build System**: TypeScript compiler (tsc)

## Development Approach
- **Hybrid Query Strategy**: DNS lookups for speed + WHOIS queries for accuracy
- **Concurrent Processing**: Promise.all() for parallel TLD checking
- **Stateless Design**: No data persistence or session storage
- **Error Isolation**: Failed queries don't affect successful ones

## Common Commands

### Setup and Installation
```bash
npm install                 # Install dependencies
npm run build              # Compile TypeScript
```

### Development
```bash
npm run dev                # Start development server
npm run watch              # Watch mode for TypeScript compilation
```

### Testing
```bash
npm test                   # Run all tests
npm run test:unit          # Run unit tests only
npm run test:property      # Run property-based tests
npm run test:coverage      # Run tests with coverage report
```

### Build and Deployment
```bash
npm run build              # Production build
npm run lint               # Run linting
npm run type-check         # TypeScript type checking
```

## Code Quality Standards
- All code must pass TypeScript strict mode compilation
- Minimum 90% test coverage required
- Property-based tests must run minimum 100 iterations
- All public methods must have JSDoc documentation
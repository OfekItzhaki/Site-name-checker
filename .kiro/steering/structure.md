# Project Structure

## Directory Organization

```
├── .kiro/                          # Kiro configuration and specs
│   ├── specs/                      # Feature specifications
│   │   └── domain-availability-checker/
│   │       ├── requirements.md     # User stories and acceptance criteria
│   │       ├── design.md          # Architecture and design decisions
│   │       └── tasks.md           # Implementation task breakdown
│   └── steering/                   # Project guidance documents
├── .vscode/                        # VS Code configuration
├── src/                           # Source code (to be created)
│   ├── controllers/               # Domain controller orchestration
│   ├── services/                  # DNS and WHOIS query services
│   ├── validators/                # Input validation logic
│   ├── models/                    # TypeScript interfaces and types
│   ├── ui/                        # User interface components
│   ├── patterns/                  # Design pattern implementations
│   │   ├── observer/              # Event Bus and Observer pattern
│   │   ├── factory/               # Service Factory pattern
│   │   ├── strategy/              # Query Strategy pattern
│   │   ├── command/               # Command pattern for operations
│   │   ├── state/                 # State pattern for UI state management
│   │   └── repository/            # Repository pattern for data access
│   └── utils/                     # Utility functions
├── tests/                         # Test files (to be created)
│   ├── unit/                      # Unit tests
│   ├── property/                  # Property-based tests
│   ├── integration/               # Integration tests
│   └── patterns/                  # Design pattern tests
├── public/                        # Static web assets (to be created)
│   ├── index.html                 # Main HTML file
│   ├── styles.css                 # CSS styles
│   └── assets/                    # Images and other static files
├── package.json                   # Node.js dependencies and scripts
├── tsconfig.json                  # TypeScript configuration
└── jest.config.js                 # Jest testing configuration
```

## Architecture Layers

### UI Interface Layer (`src/ui/`)
- Handles user interactions and form validation feedback
- Manages loading states and result display
- Provides responsive design across devices
- **Strict separation**: Only presentation logic, no business logic

### Controller Layer (`src/controllers/`)
- Orchestrates domain checking workflow using design patterns
- Coordinates between UI, validation, and query engine
- Manages application state using State pattern
- Publishes events through Event Bus (Observer pattern)

### Service Layer (`src/services/`)
- **DNS Lookup Service**: Fast initial availability checks
- **WHOIS Query Service**: Definitive availability status
- **Result Aggregator**: Combines and formats query results
- Created through Service Factory pattern

### Validation Layer (`src/validators/`)
- Domain name format validation
- Input sanitization and length constraints
- Character validation (alphanumeric and hyphens only)

### Model Layer (`src/models/`)
- TypeScript interfaces (DomainResult, QueryRequest, etc.)
- Enums (AvailabilityStatus)
- Type definitions for API contracts
- Pattern-specific interfaces (ICommand, IStrategy, etc.)

### Pattern Layer (`src/patterns/`)
- **Observer Pattern**: Event Bus for loose coupling
- **Factory Pattern**: Service creation and configuration
- **Strategy Pattern**: Different query strategies
- **Command Pattern**: Encapsulated operations with retry logic
- **State Pattern**: Application state management
- **Repository Pattern**: Data access abstraction

## File Naming Conventions
- **Classes**: PascalCase (e.g., `DomainController.ts`)
- **Interfaces**: PascalCase with 'I' prefix (e.g., `IDomainResult.ts`)
- **Services**: PascalCase with 'Service' suffix (e.g., `DNSLookupService.ts`)
- **Tests**: Match source file with `.test.ts` suffix (e.g., `DomainController.test.ts`)
- **Property Tests**: `.property.test.ts` suffix for property-based tests

## Import Organization
1. Node.js built-in modules
2. Third-party npm packages
3. Internal project modules (relative imports)
4. Type-only imports (using `import type`)

## Testing Structure
- **Unit Tests**: Test individual components in isolation
- **Property Tests**: Validate universal behaviors across input space
- **Integration Tests**: Test component interactions and workflows
- Each test file should be co-located with its source file when possible
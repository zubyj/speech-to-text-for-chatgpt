# Claude Helper Guide

## Build Commands
- Build: `npm run build` - Compiles TypeScript files
- Watch: `npm run watch` - Compiles TypeScript files in watch mode

## Code Style Guidelines
- **Naming Conventions**:
  - Classes: PascalCase (SpeechToTextManager, SpeechRecognitionService)
  - Methods/properties: camelCase 
  - Constants: UPPER_SNAKE_CASE
  - IDs/selectors: lowercase-with-dashes

- **TypeScript**:
  - Use strict typing for all variables, parameters, and return values
  - Define interfaces for complex objects in separate type files
  - Use optional parameters with ? notation when appropriate

- **Error Handling**:
  - Use try/catch for async operations
  - Implement specific error messages for different error types
  - Propagate errors upward through callbacks

- **Code Organization**:
  - Services in separate files under /services directory
  - Interfaces/types in separate files
  - Keep related functionality in the same class
  - Separate UI handling from core business logic

- **Comments/Documentation**:
  - Document complex operations and algorithms
  - Use console.group/groupEnd for debugging related logs
# Refactor Plan: Functions API Testability

## Goals
- Make Firebase Functions logic testable without requiring Firebase emulators or network.
- Improve separation of concerns and modularity.
- Allow mocking of Firestore and external services (OpenAI) in unit tests.

## Current Issues
- Business logic, HTTP handling, and Firebase setup are intermingled in `functions/index.js`.
- Direct use of `admin.firestore()` and `process.env` makes dependency injection difficult.
- Handlers return responses directly via `res`, limiting ability to test pure logic.

## Proposed Refactor
1. **Separate initialization and handlers**
   - Move Firebase admin initialization and collection helper into `lib/firebase.js`.
   - Export a function `getDb(collectionName)` returning the collection reference.

2. **Extract pure handlers**
   - For each API (`listItems`, `getItem`, etc.), create a pure function in `lib/handlers.js` that accepts dependencies:
     ```js
     async function listItems({ db }, { limit }) { ... }
     ```
   - These functions return plain JavaScript objects (data or errors) without using `req`/`res`.

3. **Thin HTTP wrappers**
   - In `index.js`, keep only small wrappers using `onRequest` that parse the HTTP request, call the handler, and send a response.
   - This layer can be smoke tested with integration tests, while unit tests focus on pure handlers.

4. **Dependency Injection**
   - Pass dependencies such as Firestore collection, `Date.now`, and external APIs (e.g., OpenAI client) as parameters to handlers.
   - In tests, provide mocks/stubs for these dependencies.

5. **Common utilities**
   - Move shared helpers (`setCors`, `handleOptions`, `readJson`) into a `lib/http.js` module for reuse and isolated testing.

6. **Testing strategy**
   - Write unit tests for each handler using in-memory or mocked Firestore.
   - Use integration tests with Firebase emulator for full request/response validation if needed.

## Benefits
- Handlers can be tested with simple dependency mocks.
- Clear separation between logic and platform-specific code.
- Easier maintenance and future feature development.


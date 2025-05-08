# Libraries

## neverthrow

neverthrow is a TypeScript library that provides a functional alternative to using exceptions for error handling. It introduces a Result type with two variants:

- Ok<T>: represents a successful result containing a value of type T
- Err<E>: represents a failure containing an error of type E

This pattern enforces explicit handling of success and failure cases, similar to Rust’s Result or Haskell’s Either.

Key Features:
- Chainable methods like .map(), .mapErr(), .andThen(), and .asyncAndThen() to transform or chain results
- Safer and more predictable error handling compared to try/catch
- Built-in fromThrowable() and tryCatch() helpers to wrap unsafe functions


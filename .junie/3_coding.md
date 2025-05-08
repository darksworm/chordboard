# Coding

This document contains coding style and rules for the ChordBoard project.

## Libs
- Vexchords: https://github.com/0xfe/vexchords

## Rules
- Let's use TypeScript with strict types.
- Avoid `any` at all costs.
- Write the code as simple as possible, prefer repetition to abstraction.
- Put everything into a few constructs and files, and we will refactor later.
- Use `const` and `let` instead of `var`.
- Use `===` and `!==` instead of `==` and `!=`.
- Don't write tests unless explicitly asked for.
- Don't write comments unless the intent of the code is opaque.
- Prefer separating "business logic" from the "presentation logic" (e.g. in React, prefer separating the component from the business logic).
- Prefer using functional programming over OOP.
- Commits should be be written using the semantic commit format.

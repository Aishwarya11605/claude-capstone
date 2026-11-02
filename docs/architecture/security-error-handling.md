# Security and Error Handling Considerations

## Security constraints (existing)

- Client-only app: all data and logic runs in the browser. The dataset contains `correctOptionId` so answers are not secret.
- CSP: Production build injects a Content-Security-Policy meta tag (see README). Dev server deliberately has no CSP.
- DOM safety: lint rules forbid injecting HTML (innerHTML, outerHTML, insertAdjacentHTML)

## Planned changes and security considerations

### Persistence (optional)
- Storage location: `localStorage` only (browser-local)
- Data stored: minimal attempt snapshot (answers, index, endAt); no PII should be stored.
- Integrity: attempt data is tamperable (user can edit localStorage). This is acceptable for low-stakes use and must be documented as a limitation.
- Dataset mismatch: invalidate restore if dataset signature differs from current dataset to avoid crashes/incorrect deserialization.


### Timer correctness
- Persist timer as absolute `endAt` (epoch ms) not remaining-seconds.
- Resume should recompute remaining time from the injected clock to match existing rules: monotonic v wall-clock, and never go backwards.

### Error handling

- Bootstrap errors: `src/main.ts` catches unhandled exceptions and renders an error view with the exception etrace for debugging.
- Dataset validation error: app shows a non-startable error screen with details logged to console.
- Persistence error: if stored JSON is corrupted/old/fails, clear and fallback to Start screen (while logging minimal diagnostics).

### Accessibility (a1y)
- Error view must be tested with the same axe/contrast checks as other views (planned e2i test addition).

## Risks to track
- Persistence may conflict with existing README limitations under "No persistence". If implemented, documentation must be updated.

# ADR-002: Persist timer using an absolute `endAt` timestamp

Date: 2026-11-02
Status: Proposed (planned)

## Context

The quiz has a fixed 5-minute limit and an existing rule that time does not go backwards (see README on monotonic vs wall clock).

The planned persistence feature needs to restore time correctly across reloads and suspend/resume.

## Decision

- Persist the quiz deadline as an absolute epoch timestamp `endAt` (e.g. milliseconds since Unix epoch).
- On resume, compute remaining time as `endAt - clock.now()` (using the same injected clock abctraction the timer logic already uses).

## Consequences

Positive:
- Avoids drift from "remaining seconds" storage and tick scheduling
- Simplifies expiry detection: if `remaining <= 0` it expired
- Aligns with existing rule that wall clock jumps forward shorten the quiz

Negative:
- Restore depends on the user's clock behavior (but this is already a documented limitation)

## Implementation notes

- Save `endAt` the moment the at which the attempt starts (e.g. `now() + duration`)
- Do not store a per-second countdown or depend on paused timer intervals


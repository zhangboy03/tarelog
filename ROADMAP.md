# Roadmap

The roadmap is ordered by trust and usability, not feature count.

## Now — open-source foundation

- [x] Distinct project name and public project page
- [x] Private journal separated from static public samples
- [x] Server-side access checks for every journal data endpoint
- [x] Reproducible Apple Health Shortcut source without embedded instance secrets
- [x] Contribution, governance, security, privacy, architecture, and deployment documentation
- [x] First tagged `v0.1.0` release after a clean public-repository security scan

Acceptance: a new visitor understands the project in 30 seconds, can run it locally from the README, and cannot reach real journal data without a configured token.

## Next — dependable self-hosting

- Export food history as documented JSON or CSV
- Document D1 backup and restore with a tested recovery exercise
- Add export and complete record-deletion flows for D1 journal data
- Publish container or equivalent provider-neutral deployment instructions
- Add a read-only, resettable demo only if uploads and real data remain impossible

Acceptance: a new self-hoster can deploy, back up, export, delete, and restore their data without maintainer intervention.

## Later — careful expansion

- Multi-user ownership and isolation, backed by a real identity provider
- Optional local vision/OCR provider
- Barcode lookup through an open, structured food database
- Community-maintained canonical food aliases with provenance

## Non-goals

- Medical diagnosis or automated treatment advice
- Food morality scores, shame, or social leaderboards
- Hidden nutrition estimates presented as observed facts
- Default analytics, advertising, or data brokerage
- A plugin architecture before a second concrete integration needs it

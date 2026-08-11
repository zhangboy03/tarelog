# Security Policy

## Reporting a vulnerability

Use GitHub's [Report a vulnerability](https://github.com/zhangboy03/tarelog/security/advisories/new) private advisory for this repository. Do not open a public issue for security problems.

Include the affected version, impact, minimal reproduction, and a suggested fix if available. Do not send real access tokens, API keys, personal photos, Apple Health exports, or production databases. If sensitive evidence is necessary, first agree on a safe channel inside the private advisory.

## Supported versions

Security fixes target the latest release and the default branch. Forks, third-party model services, and deployer-managed cloud accounts remain the deployer's responsibility.

## Deployment security requirements

- Set `APP_ACCESS_TOKEN` to at least 24 random characters before network exposure.
- Use a different random `HEALTH_SYNC_TOKEN` for Apple Health synchronization.
- Store secrets in the hosting platform's secret manager, never in Git or a generated Shortcut committed to Git.
- Serve the journal only over HTTPS outside localhost.
- Keep the public project page separate from the private journal and never use real data in a public demo.
- Limit D1 and model-account permissions and spending.
- Rotate any token that may have appeared in a log, screenshot, shared Shortcut, or repository history.
- Enable GitHub secret scanning, push protection, Dependabot alerts, and code scanning on the public repository.

The access-token gate is intentionally small and single-user. It is not a multi-tenant identity system. Deployments that need multiple users, revocation, audit logs, or role separation must add a real identity layer and server-side ownership checks.

See [docs/PRIVACY.md](docs/PRIVACY.md) for data flows and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for a release checklist.

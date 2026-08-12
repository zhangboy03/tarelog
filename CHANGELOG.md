# Changelog

All notable changes are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and releases use Semantic Versioning.

## [Unreleased]

### Added

- Multi-photo capture queues that preserve selection order and review each result before saving.

### Changed

- Trusted-device sessions now remain valid for up to 400 days unless the access token is rotated or the owner signs out.

### Fixed

- Rejected unsafe post-login redirect targets that use network-path references or backslashes.
- Kept local image optimization working when the production asset binding is unavailable.

## [0.1.0] - 2026-08-11

### Added

- Tarelog open-source project page and brand system.
- Access-token session gate for the private journal and data APIs.
- Privacy, architecture, deployment, Apple Health, governance, roadmap, and community documentation.
- GitHub issue and pull-request templates.
- Photo and manual analysis that remain temporary until confirmation, without storing uploaded photos.
- Deployment configuration for personal targets, time zone, and quick foods.

### Changed

- Renamed Eat Well / weekend-kitchen product surfaces to Tarelog.
- Apple Health Shortcut generation now requires a deployer-owned HTTPS endpoint and token.
- Public documentation now distinguishes label OCR, generic USDA matching, and device-only Apple Health validation.

### Fixed

- Prevented maintainer-only migration files from rewriting or deleting journal history.
- Prevented cooked rice and other exact names from matching unsafe short aliases.
- Rejected unrelated USDA search results and unverified cached nutrition sources.
- Distinguished a real zero on a package label from a nutrient the label did not provide.
- Corrected provider endpoint construction and Apple Health token transport.
- Pinned a build-tool version that removes the vulnerable `image-size` dependency.

### Removed

- Prebuilt Apple Shortcut files tied to a specific deployment.

[Unreleased]: https://github.com/zhangboy03/tarelog/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/zhangboy03/tarelog/releases/tag/v0.1.0

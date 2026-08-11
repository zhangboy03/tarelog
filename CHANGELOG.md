# Changelog

All notable changes are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and releases use Semantic Versioning.

## [Unreleased]

### Fixed

- Prevented maintainer-only migration files from rewriting or deleting journal history.
- Prevented cooked rice and other exact names from matching unsafe short aliases.
- Rejected unrelated USDA search results and unverified cached nutrition sources.
- Distinguished a real zero on a package label from a nutrient the label did not provide.
- Corrected provider endpoint construction and Apple Health token transport.
- Pinned a build-tool version that removes the vulnerable `image-size` dependency.

### Changed

- Photo and manual analysis remain temporary until confirmation; Tarelog no longer stores uploaded photos.
- Personal targets, time zone, and quick foods are deployment configuration rather than maintainer defaults.
- Public documentation now distinguishes label OCR, generic USDA matching, and device-only Apple Health validation.

## [0.1.0] - 2026-08-11

### Added

- Tarelog open-source project page and brand system.
- Access-token session gate for the private journal and data APIs.
- Privacy, architecture, deployment, Apple Health, governance, roadmap, and community documentation.
- GitHub issue and pull-request templates.

### Changed

- Renamed Eat Well / weekend-kitchen product surfaces to Tarelog.
- Apple Health Shortcut generation now requires a deployer-owned HTTPS endpoint and token.

### Removed

- Prebuilt Apple Shortcut files tied to a specific deployment.

[Unreleased]: https://github.com/zhangboy03/tarelog/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/zhangboy03/tarelog/releases/tag/v0.1.0

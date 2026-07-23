# Changelog

All notable changes to Omnio are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Pre-release stages progress `alpha → beta → rc → stable`; see
[docs/architecture/09-releases.md](docs/architecture/09-releases.md).

## [Unreleased]

## [0.2.0-alpha] - 2026-07-23

Omnio grows from a solid file workspace into a genuine PDF powerhouse — the kind of jobs people used to open a separate app for now happen right here, on your device.

### New

- **Turn a scanned document into a searchable one.** Point Omnio at a scan or a photo of text and it reads the words, so you can search and copy from a document that used to be just a picture — all on your device.
- **A real PDF editor.** Highlight and underline, draw shapes and freehand, add sticky notes, and — when something must truly disappear — redact it. Redaction genuinely removes the words and pictures underneath, not just hides them behind a black box.
- **Fill in PDF forms.** Type straight into a form's fields and download the finished file, with the option to lock your answers so they can't be changed.
- **Pull things out of a PDF.** Save every picture inside a PDF at full quality, or lift out files that were attached to it.
- **Repair a damaged PDF** by rebuilding a clean, readable copy — and **split a long PDF into chapters** using its own bookmarks.
- **Get a file ready for the web** by optimizing it to open page-by-page, or **clean a file** by stripping hidden, unused content.
- **See exactly what you're running.** Settings now shows your version, release date, build, and commit, with a "Check for updates" button — and What's New is now your plain-language history of everything Omnio has gained.

### Improved

- **Everyday PDF work keeps getting smoother** — drop a PDF and Omnio suggests the right tool, whether that's making it searchable, filling a form, or redacting something sensitive.

### Known limitations

- **Converting Office files (Word, Excel, PowerPoint) to PDF** isn't available yet — it's coming as a fast, on-device conversion that needs no downloads.
- **Turning a PDF back into an editable Word or Excel file**, and **archival PDF/A** conversion, aren't available yet.
- **Signing** today means drawing your signature by hand; a typed or image-stamp signature is still to come.

## [0.1.0-alpha.1] - 2026-07-18

The first public version of Omnio: a private, self-hosted workspace with dozens of everyday file and text tools that all run on your device.

### New

- **The first wave of tools** — convert between JSON, YAML and CSV; decode tokens and encodings; generate UUIDs, hashes and strong passwords; format and compare text; and calculate loans, tips, dates, colors and more. Everything works in English and Hebrew, right-to-left included.
- **A workspace to work in** — search everything from one place, star your favorites, drop files straight onto the page, and jump around with the keyboard.
- **Runs entirely on your device** — files never leave your browser, and there's no account to create.

[Unreleased]: https://github.com/MordechaiN/Omnio/compare/v0.2.0-alpha...HEAD
[0.2.0-alpha]: https://github.com/MordechaiN/Omnio/compare/v0.1.0-alpha.1...v0.2.0-alpha
[0.1.0-alpha.1]: https://github.com/MordechaiN/Omnio/releases/tag/v0.1.0-alpha.1

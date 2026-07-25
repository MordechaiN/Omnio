# Changelog

All notable changes to Omnio are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Pre-release stages progress `alpha → beta → rc → stable`; see
[docs/architecture/09-releases.md](docs/architecture/09-releases.md).

## [Unreleased]

## [0.6.0-alpha] - 2026-07-25

Files grows up. Everything you do with your files should now feel like the desktop app you already know.

### 🚀 New

- **See your files your way.** Switch between big thumbnails and a compact list, and set how large the thumbnails are. Omnio remembers your choice.
- **Right-click anything.** A proper menu with everything you'd expect — open, open with, quick look, rename, duplicate, pin, tag, add to a collection, delete. It works with a long press on a touchscreen and with the menu key on a keyboard too.
- **Filter by tag and collection**, with a count on the button so a filtered view can never be mistaken for an empty one.
- **Save a search you use often** and bring it back with one click.
- **Collections.** Group related files however you like, and create a new group as you file something into it.
- **Duplicate a file** without using any extra space.

### ✨ Improved

- Selecting files in a large workspace stays smooth — moving through them no longer redraws everything on screen.
- The details panel gained a copy button for a file's details, and now draws where a file came from as a chain you can follow rather than a flat list.
- Renaming can be started from the right-click menu.
- The keyboard shortcuts card now lists the file shortcuts, so they can actually be discovered.


## [0.5.0-alpha] - 2026-07-24

Your files now have a home. Omnio stops being a collection of separate tools and starts behaving like one application.

### New

- **Files.** Everything you drop into Omnio is kept, so it's still there tomorrow. Search it, pin what matters, tag it, and see it all as thumbnails you can select the way you would on your desktop — click, Shift-click for a run, Ctrl-click to pick out a few.
- **A details panel that's always there.** Select a file and you immediately see a preview, its size and type, when it arrived, its tags, and its whole story: what it was made from, what you've made from it, and everything that's happened to it. No dialog to open, no waiting.
- **Tools now pass files to each other.** Anything a tool produces lands back in your files, so the result of one job is ready for the next without saving to your downloads folder and dragging it back in.
- **Quick look.** Press Space to see a file large, Escape to dismiss it. Enter or a double-click opens it in the tool that suits it best.
- **Identical files are spotted for you.** Omnio recognises when two files hold exactly the same contents — not just similar names — and only ever stores one copy.

### Improved

- Deleting a file can be undone.
- Thumbnails are remembered, so coming back to your files shows them straight away rather than redrawing everything.

### Known limitations

- Files are kept on this device, in this browser. They are not synced anywhere, and clearing your browser's data will clear them — treat exported copies as the real backup.
- Private browsing usually forbids storing files. Omnio detects this and says so; tools still work, files just aren't remembered.
- There are no folders. Tags, collections and search cover the same ground for now.


## [0.4.0-alpha] - 2026-07-24

Working with a PDF's pages stops feeling like filling in a form and starts feeling like handling paper.

### New

- **See and rearrange your pages.** Every page appears as a picture you can pick up and drag into a new order. Select one, a run of them, or the whole document, then turn them, copy them, throw them away, or slip in a blank — and watch it happen. Changed your mind? Undo takes it back.
- **Sign a document.** Draw your signature with a mouse or finger, type your name and have it written out for you, or use a picture of a signature you already have. Then place it wherever it belongs. This puts your signature on the page the way a pen would — it isn't a digital certificate, and Omnio says so plainly rather than letting you assume otherwise.
- **Build a table of contents.** Add bookmarks, rename them, nest them under one another, and move them around, so a long document opens with a proper contents list to jump from.

### Improved

- Page thumbnails appear as they finish drawing, so a long document is usable straight away instead of after the last page.

### Fixed

- Omnio reported its own version as `0.0.0-dev` with an unknown commit. Every screen that shows the version — About, Settings, the footer — was showing a build that never existed. It now reports the real release, and a build missing that information fails rather than shipping a file that misdescribes itself.

### Known limitations

- A signature is a picture of your signature, not a cryptographic one. It carries no proof of identity that software can check.
- PDF/A (the long-term archival format) still isn't supported. Producing it properly needs a conversion engine Omnio doesn't yet carry, and a file that claims to be PDF/A without passing validation would be worse than none.
- Turning Office documents into PDFs runs on your Omnio server rather than in your browser, so that one job does send the file off your device — unlike everything else here.

## [0.3.0-alpha] - 2026-07-23

Omnio starts doing the heavy jobs for you — right on your own server, with nothing to download.

### New

- **Turn Word, Excel, and PowerPoint files into PDFs.** Drop in a .docx, .xlsx, .pptx (or OpenDocument or RTF) and get back a faithful PDF. The conversion runs privately on your own Omnio — your file never goes to any outside service, and you never have to install anything.


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

[Unreleased]: https://github.com/MordechaiN/Omnio/compare/v0.6.0-alpha...HEAD
[0.6.0-alpha]: https://github.com/MordechaiN/Omnio/compare/v0.5.0-alpha...v0.6.0-alpha
[0.5.0-alpha]: https://github.com/MordechaiN/Omnio/compare/v0.4.0-alpha...v0.5.0-alpha
[0.4.0-alpha]: https://github.com/MordechaiN/Omnio/compare/v0.3.0-alpha...v0.4.0-alpha
[0.3.0-alpha]: https://github.com/MordechaiN/Omnio/compare/v0.2.0-alpha...v0.3.0-alpha
[0.2.0-alpha]: https://github.com/MordechaiN/Omnio/compare/v0.1.0-alpha.1...v0.2.0-alpha
[0.1.0-alpha.1]: https://github.com/MordechaiN/Omnio/releases/tag/v0.1.0-alpha.1

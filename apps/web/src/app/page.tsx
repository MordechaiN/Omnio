const entryPoints = [
  {
    title: "Search",
    body: "Type what you need — “compress PDF”, “resize image”, “convert MP4” — and go straight there.",
  },
  {
    title: "Categories",
    body: "Browse tools by what they work on: images, PDF, video, audio, text, developer, and more.",
  },
  {
    title: "Drop a file",
    body: "Drop anything. Omnio recognizes it and shows every action it can take — right on your device.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-12 px-6 py-16">
      <header className="flex flex-col gap-4">
        <p className="text-sm font-medium tracking-wide text-accent">Self-hosted · privacy-first</p>
        <h1 className="text-5xl font-semibold tracking-tight">Omnio</h1>
        <p className="text-xl text-text-muted">Everything. One Workspace.</p>
        <p className="max-w-prose text-text-muted">
          One beautiful interface for opening, viewing, editing, converting and managing virtually
          every common file format — running entirely on your own hardware.
        </p>
      </header>

      <section aria-label="How Omnio works" className="grid gap-4 sm:grid-cols-3">
        {entryPoints.map((entry) => (
          <article
            key={entry.title}
            className="flex flex-col gap-2 rounded-xl border border-border-subtle bg-surface p-5"
          >
            <h2 className="font-medium">{entry.title}</h2>
            <p className="text-sm text-text-muted">{entry.body}</p>
          </article>
        ))}
      </section>

      <footer className="text-sm text-text-muted">
        Platform under construction — milestone M1 of the{" "}
        <a
          className="font-medium text-accent underline-offset-4 hover:underline"
          href="https://github.com/MordechaiN/Omnio/tree/main/docs/architecture"
        >
          architecture roadmap
        </a>
        .
      </footer>
    </main>
  );
}

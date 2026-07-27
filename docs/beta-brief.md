# Omnio — a note for the first testers

Thank you for agreeing to try this. There are a few dozen of you, you were asked
personally, and I would rather have your honest reaction than a polite one.

This is not a launch. Omnio is alpha software. Some of it is genuinely good and
some of it I am too close to see clearly, which is the entire reason you are
here.

---

## What Omnio is

A workspace for everyday file work — PDFs, images, documents, text. Merge and
split pages, sign a document, redact something properly, shrink a photo that is
too big to email, turn a scan into text you can search. Around a hundred tools,
though the number is not the point.

The difference is where the work happens: **on your own machine, in your own
browser.** Not on my server, not on anyone's. There is no account. There is
nothing to sign up for. I do not know who you are, and Omnio has no way to tell
me.

## What makes it different

Three things, and only the third is unusual.

**Your file does not go anywhere.** Most free file tools are websites you upload
to. The upload is the price. Omnio does the same jobs in the page you already
have open, so there is nothing to upload and nothing to delete afterwards.

You do not have to take my word for this. Open your browser's developer tools,
watch the network panel, and use Omnio normally. You should see your files go
nowhere. If you ever see something you did not expect, that is the single most
important bug you could send me. (One honest exception, below.)

**It remembers.** Files you have worked on stay in your workspace, so next week
you are not starting from an empty screen.

**It notices things, and says why.** Drop in a scan and Omnio will say it looks
like a scan, because there is no selectable text in it, and offer to make it
searchable. It spots duplicates, drafts of the same document, photos still
carrying their location, exports that have gone stale because you edited the
original afterwards. Every observation tells you *why* it thinks so, offers one
next step, and can be dismissed permanently. When it does not know, it is meant
to stay quiet.

That last part is the piece I am least sure about, and the piece I most want you
to push on.

## What I would like you to try

Please use it for something real. A test file tells me the buttons work; your own
work tells me whether the product does.

- **Do a job you would otherwise have done on a converter website.** That is the
  comparison that matters.
- **Come back in a few days and do another one.** Almost everything interesting
  about Omnio only appears the second and third time — the observations, the
  routines it offers to remember, the sense of a workspace rather than a tool.
- **Do the same thing twice in a row.** Omnio should offer to remember the
  sequence. Tell me if that felt helpful or presumptuous.
- **Try it in Hebrew** if you read Hebrew. It is not a translation layer; the
  whole thing is built to work right-to-left. I need to know whether that is
  true in practice.
- **Try it without a mouse**, even briefly.
- **Try it with the server switched off**, or your Wi-Fi off. Nearly everything
  should keep working. If it does not, I want to know which part stopped.

## What feedback helps most

Bugs are welcome, but they are not what I am short of.

**Tell me where you hesitated.** Any moment you paused and thought "what will
this do?" or "where did my file go?" is worth more to me than a crash. Crashes
are easy to find; hesitation is invisible from the inside.

**Tell me what you expected to happen.** If Omnio did something reasonable but
not what you assumed, the assumption is the useful part.

**Tell me where you stopped trusting it.** If anything made you think "I would
not put a real contract in this", I want that sentence exactly as it occurred to
you, even if you cannot justify it.

**Tell me what you did not use.** A tool you ignored is more informative than
one you liked.

Vague is fine. "Something about the file list felt off" is a real report. I would
rather chase a vague feeling than never hear it.

## What you should know before you start

These are not bugs. I would rather you heard them from me first.

- **Your files live in this browser, on this device.** They are not synced, not
  backed up by me, and not available in another browser or on your phone. If you
  clear your browsing data, they are gone and I cannot get them back. There is an
  export — that file is the only real backup. **Please do not let Omnio hold the
  only copy of anything that matters yet.**
- **Two tools out of a hundred-odd do leave your machine**, and both say so on
  their own page before you use them. Turning Word, Excel or PowerPoint files
  into PDFs is too heavy for a browser, so it runs on the Omnio server — if you
  are using my instance, that means my server. A small "Uppercase" tool left
  over from early development does the same. Everything else runs where you are.
  If you are watching the network panel, those two are what you will see.
- **Archiving a file removes its contents permanently.** The record stays, the
  contents do not.
- **When Omnio offers to rebuild a stale export, it prepares the job but does not
  run it.** It opens the right tool with everything loaded; you press the button.
  Omnio does not run tools while you are not looking.
- **It groups drafts only when the filenames plainly say so.** It will miss
  drafts named some other way. I would rather it missed them than guessed wrong.
- **It is alpha, and it says so** — the version in About tells you exactly what
  you are running.

## How to report something

In Omnio: **About → Report a problem.**

It opens a half-written bug report with your version, browser and system details
already filled in, in a collapsed block. **Nothing is sent anywhere until you
press submit.** Read it, delete anything you would rather not share, and send it.

I built it this way for a reason: Omnio has no server that collects reports, and
adding one to make feedback easier would quietly break the promise the whole
product rests on. So the inconvenience is deliberate, and it is mine to make up
for by replying.

If you can, include:

```
What I did:
What I expected:
What happened:
Does it happen every time?
```

**Please do not send me your actual document.** If a specific file causes the
problem, tell me whether it also happens with a file you do not mind sharing.

For anything security-related, please do not open a public issue — `SECURITY.md`
in the repository explains where to send it privately.

## What I will do

I will read everything, and reply. When a report of yours is fixed, I will tell
you which build it is in. If I decide not to change something, I will tell you
that too, and why — I would rather disagree with you openly than let a report
disappear.

Two things I already know are missing: nobody has yet used this with a screen
reader, and nobody has yet used it on a workspace built up over months. If you
end up being the first at either, your report is worth ten of mine.

Thank you for the time. Be blunt.

— Mordechai Neeman

/**
 * Search synonym expansion — the palette's fuzzy matcher only sees the terms
 * we feed it, so common aliases are expanded here: searching "guid" must find
 * the UUID generator without the module having to enumerate every alias.
 * Keys match against a tool's own keywords/id; values are appended as extra
 * search terms.
 */
const SYNONYMS: Record<string, string[]> = {
  uuid: ["guid", "identifier", "unique id"],
  password: ["passphrase", "credentials", "secret", "pwgen"],
  json: ["object notation", "pretty print"],
  base64: ["b64", "encode", "decode"],
  hash: ["md5", "sha", "sha256", "checksum", "digest"],
  cron: ["schedule", "scheduler", "timer", "job"],
  ip: ["address", "network"],
  subnet: ["netmask", "network"],
  pdf: ["document", "pages"],
  image: ["picture", "photo", "img", "graphic"],
  resize: ["scale", "shrink", "enlarge", "compress"],
  compress: ["optimize", "smaller", "reduce", "minify", "resize"],
  crop: ["trim", "cut"],
  color: ["colour", "palette", "swatch"],
  exif: ["metadata", "gps", "privacy"],
  chmod: ["permissions", "file mode", "unix"],
  interest: ["savings", "investment", "growth"],
  loan: ["mortgage", "payment"],
  regex: ["regexp", "regular expression", "pattern"],
  markdown: ["md", "preview"],
  diff: ["compare", "difference", "delta"],
  timestamp: ["epoch", "unix time", "date"],
  url: ["link", "uri", "percent encoding"],
  jwt: ["token", "bearer", "claims"],
  slugify: ["slug", "url friendly", "kebab"],
  lorem: ["placeholder text", "dummy text", "filler"],
  csv: ["spreadsheet", "comma separated"],
  yaml: ["yml", "config"],
  merge: ["combine", "join"],
  split: ["extract", "separate"],
  rotate: ["turn", "orientation"],
  watermark: ["stamp", "overlay"],
  photo: ["image", "picture"],
  batch: ["bulk", "mass", "many files", "all at once"],
  qr: ["qrcode", "barcode", "scan code"],
  favicon: ["site icon", "tab icon", "apple touch"],
  status: ["error code", "response code"],
  mime: ["content type", "media type", "file type"],
  timezone: ["time zone", "utc", "world clock", "gmt"],
  salary: ["wage", "income", "paycheck"],
  strength: ["checker", "how strong", "secure password"],
  xml: ["svg", "markup"],
  zip: ["archive", "compressed folder"],
  trim: ["cut", "clip", "shorten"],
};

/** Expand a tool's keyword list with known aliases (idempotent, de-duplicated). */
export function expandKeywords(id: string, keywords: readonly string[]): string[] {
  const expanded = new Set<string>(keywords);
  const haystack = [id.toLowerCase(), ...keywords.map((k) => k.toLowerCase())];
  for (const [term, aliases] of Object.entries(SYNONYMS)) {
    if (haystack.some((k) => k.includes(term))) {
      for (const alias of aliases) expanded.add(alias);
    }
  }
  return [...expanded];
}

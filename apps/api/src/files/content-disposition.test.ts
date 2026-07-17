import { describe, expect, it } from "vitest";
import { attachmentDisposition } from "./content-disposition";

describe("attachmentDisposition", () => {
  it("always marks the response as an attachment", () => {
    expect(attachmentDisposition("report.pdf")).toMatch(/^attachment;/);
  });

  it("sanitizes the ASCII fallback and preserves the exact name in filename*", () => {
    const header = attachmentDisposition('rép"ort\n.pdf');
    expect(header).toContain('filename="r_p_ort_.pdf"');
    expect(header).toContain("filename*=UTF-8''r%C3%A9p%22ort%0A.pdf");
  });

  it("falls back to a default for an empty name", () => {
    expect(attachmentDisposition("")).toContain('filename="download"');
  });
});

import { describe, expect, it } from "vitest";
import { UploadValidationError, validateUploadHead } from "./file-validation";

const PNG_HEADER = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from([0x00, 0x00, 0x00, 0x0d]),
  Buffer.from("IHDR"),
  Buffer.alloc(17),
]);
const PDF_HEADER = Buffer.from("%PDF-1.7\n%âãÏÓ\n", "latin1");
const TEXT = Buffer.from("id,name\n1,omnio\n");

describe("validateUploadHead", () => {
  it("accepts a PNG named .png and reports its detected MIME", async () => {
    const result = await validateUploadHead({ filename: "logo.png", head: PNG_HEADER });
    expect(result.mime).toBe("image/png");
  });

  it("rejects a PNG masquerading as a PDF", async () => {
    await expect(
      validateUploadHead({ filename: "invoice.pdf", head: PNG_HEADER }),
    ).rejects.toBeInstanceOf(UploadValidationError);
  });

  it("accepts a PDF named .pdf", async () => {
    const result = await validateUploadHead({ filename: "doc.pdf", head: PDF_HEADER });
    expect(result.mime).toBe("application/pdf");
  });

  it("trusts a safe declared MIME for undetectable text", async () => {
    const result = await validateUploadHead({
      filename: "data.csv",
      declaredMime: "text/csv",
      head: TEXT,
    });
    expect(result.mime).toBe("text/csv");
  });

  it("falls back to octet-stream for unknown undetectable content", async () => {
    const result = await validateUploadHead({ filename: "blob.bin", head: TEXT });
    expect(result.mime).toBe("application/octet-stream");
  });
});

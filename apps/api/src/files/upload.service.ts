import { createHash } from "node:crypto";
import { Transform } from "node:stream";
import { BadRequestException, Inject, Injectable, PayloadTooLargeException } from "@nestjs/common";
import type { FileObject } from "@omnio/db";
import type { StorageDriver } from "@omnio/storage";
import busboy from "busboy";
import type { Request } from "express";
import { OMNIO_ENV } from "../config/config.module";
import type { Env } from "../env";
import { PrismaService } from "../infra/prisma.service";
import { STORAGE_DRIVER } from "../storage/storage.module";
import { HEAD_BYTES, UploadValidationError, validateUploadHead } from "./file-validation";

/**
 * Streams a single multipart upload into scratch storage while validating it in
 * one pass: size is capped as bytes arrive, the SHA-256 is computed inline, and
 * the leading bytes are sniffed for the real content type. Any failure deletes
 * the partial object before the request returns (docs/architecture/06-security.md §3).
 */
@Injectable()
export class UploadService {
  private readonly maxBytes: number;
  private readonly ttlMs: number;

  constructor(
    @Inject(OMNIO_ENV) env: Env,
    private readonly prisma: PrismaService,
    @Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
  ) {
    this.maxBytes = env.OMNIO_MAX_UPLOAD_MB * 1024 * 1024;
    this.ttlMs = env.OMNIO_SCRATCH_TTL_HOURS * 3_600_000;
  }

  async handle(req: Request, ownerId: string): Promise<FileObject> {
    const bb = busboy({ headers: req.headers, limits: { files: 1, fileSize: this.maxBytes } });
    const key = this.storage.generateKey();

    return new Promise<FileObject>((resolve, reject) => {
      let sawFile = false;

      bb.on("file", (_field, stream, info) => {
        sawFile = true;
        const hash = createHash("sha256");
        const heads: Buffer[] = [];
        let headLen = 0;
        let truncated = false;

        stream.on("limit", () => {
          truncated = true;
        });

        // Tee hashing/head-sniffing through a Transform rather than a second
        // `stream.on("data", ...)` listener: putting a raw listener on `stream`
        // switches it to flowing mode immediately, and storage.put()'s internal
        // pipeline attaches its own consumer only after an `await mkdir` — any
        // bytes that arrive in that gap go only to the first listener and are
        // lost for the write side. A Transform's output buffers safely instead.
        const hashing = new Transform({
          transform(chunk: Buffer, _encoding, callback) {
            hash.update(chunk);
            if (headLen < HEAD_BYTES) {
              const slice = chunk.subarray(0, HEAD_BYTES - headLen);
              heads.push(slice);
              headLen += slice.length;
            }
            callback(null, chunk);
          },
        });

        this.storage
          .put("scratch", key, stream.pipe(hashing))
          .then(async (stat) => {
            if (truncated) {
              await this.cleanup(key);
              reject(
                new PayloadTooLargeException({
                  code: "file_too_large",
                  message: `File exceeds the ${this.maxBytes} byte limit.`,
                }),
              );
              return;
            }
            try {
              const { mime } = await validateUploadHead({
                filename: info.filename,
                declaredMime: info.mimeType,
                head: Buffer.concat(heads),
              });
              resolve(
                await this.persist({
                  key,
                  ownerId,
                  mime,
                  size: stat.size,
                  hash: hash.digest("hex"),
                  originalName: info.filename,
                }),
              );
            } catch (error) {
              await this.cleanup(key);
              reject(
                error instanceof UploadValidationError
                  ? new BadRequestException({ code: "invalid_file", message: error.message })
                  : error,
              );
            }
          })
          .catch(async (error: unknown) => {
            await this.cleanup(key);
            reject(error);
          });
      });

      bb.on("error", reject);
      bb.on("close", () => {
        if (!sawFile) {
          reject(new BadRequestException({ code: "no_file", message: "No file part in request." }));
        }
      });

      req.pipe(bb);
    });
  }

  private persist(input: {
    key: string;
    ownerId: string;
    mime: string;
    size: number;
    hash: string;
    originalName: string;
  }): Promise<FileObject> {
    return this.prisma.fileObject.create({
      data: {
        area: "scratch",
        driverKey: input.key,
        mime: input.mime,
        size: BigInt(input.size),
        hash: input.hash,
        originalName: input.originalName,
        ownerId: input.ownerId,
        ttlAt: new Date(Date.now() + this.ttlMs),
      },
    });
  }

  private async cleanup(key: string): Promise<void> {
    await this.storage.delete("scratch", key).catch(() => undefined);
  }
}

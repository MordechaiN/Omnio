import type { FileObjectDto } from "@omnio/contracts";
import type { FileObject } from "@omnio/db";

/** Project a stored FileObject row onto the public DTO (BigInt → number). */
export function toFileDto(file: FileObject): FileObjectDto {
  return {
    id: file.id,
    area: file.area,
    mime: file.mime,
    size: Number(file.size),
    originalName: file.originalName,
    createdAt: file.createdAt.toISOString(),
    ttlAt: file.ttlAt ? file.ttlAt.toISOString() : null,
  };
}

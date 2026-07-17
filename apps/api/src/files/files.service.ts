import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { StorageArea } from "@omnio/contracts";
import type { FileObject } from "@omnio/db";
import type { StorageDriver } from "@omnio/storage";
import { AuditAction } from "../audit/audit.actions";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../infra/prisma.service";
import { STORAGE_DRIVER } from "../storage/storage.module";

/**
 * File metadata and lifecycle for the authenticated owner. Ownership is always
 * part of the query so one user can never reach another's objects.
 */
@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
    private readonly audit: AuditService,
  ) {}

  list(ownerId: string, area?: StorageArea): Promise<FileObject[]> {
    return this.prisma.fileObject.findMany({
      where: { ownerId, ...(area ? { area } : {}) },
      orderBy: { createdAt: "desc" },
    });
  }

  async get(ownerId: string, id: string): Promise<FileObject> {
    const file = await this.prisma.fileObject.findFirst({ where: { id, ownerId } });
    if (!file) throw new NotFoundException({ code: "not_found", message: "File not found." });
    return file;
  }

  /** Promote a scratch file into the retained workspace (clears its TTL). */
  async keep(ownerId: string, id: string): Promise<FileObject> {
    const file = await this.get(ownerId, id);
    if (file.area === "workspace") return file;

    const newKey = this.storage.generateKey();
    await this.storage.put(
      "workspace",
      newKey,
      await this.storage.stream("scratch", file.driverKey),
    );
    const updated = await this.prisma.fileObject.update({
      where: { id: file.id },
      data: { area: "workspace", driverKey: newKey, ttlAt: null },
    });
    await this.storage.delete("scratch", file.driverKey).catch(() => undefined);
    return updated;
  }

  async remove(ownerId: string, id: string): Promise<void> {
    const file = await this.get(ownerId, id);
    await this.storage.delete(file.area, file.driverKey).catch(() => undefined);
    await this.prisma.fileObject.delete({ where: { id: file.id } });
    await this.audit.record({
      action: AuditAction.FileDeleted,
      actorId: ownerId,
      targetType: "file",
      targetId: file.id,
    });
  }

  streamContent(file: FileObject): Promise<NodeJS.ReadableStream> {
    return this.storage.stream(file.area, file.driverKey);
  }
}

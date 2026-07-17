import { Injectable } from "@nestjs/common";
import { Prisma } from "@omnio/db";
import { PrismaService } from "../infra/prisma.service";
import type { AuditActionValue } from "./audit.actions";

export interface AuditEntry {
  action: AuditActionValue;
  actorId?: string | null;
  targetType?: string;
  targetId?: string;
  ip?: string;
  meta?: Prisma.InputJsonValue;
}

/**
 * Append-only security audit trail. Recording is best-effort — a logging
 * failure must never break the action being audited — but the table itself is
 * never updated or deleted from application code.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: entry.action,
          actorId: entry.actorId ?? null,
          targetType: entry.targetType,
          targetId: entry.targetId,
          ip: entry.ip,
          meta: entry.meta ?? Prisma.JsonNull,
        },
      });
    } catch {
      // best-effort; never propagate an audit failure to the caller
    }
  }
}

import { Injectable } from "@nestjs/common";
import { PrismaService } from "../infra/prisma.service";

/**
 * Minimal instance/user settings access. M3 only needs the instance-level
 * analytics toggle; full settings CRUD and the admin surface arrive in M5/M9.
 */
@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getInstanceBoolean(key: string): Promise<boolean> {
    const row = await this.prisma.setting.findFirst({
      where: { scope: "instance", userId: null, key },
    });
    return row?.value === true;
  }
}

import type { OnModuleInit } from "@nestjs/common";
import { ConflictException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type { AuthStatus, Identity } from "@omnio/contracts";
import { OMNIO_ENV } from "../config/config.module";
import type { Env } from "../env";
import { PrismaService } from "../infra/prisma.service";
import { generateSessionToken, hashPassword, hashToken, verifyPassword } from "./credentials";
import type { AuthedUser } from "./types";

const SYSTEM_USERNAME = "admin";

export interface SessionMeta {
  userAgent?: string;
  ip?: string;
}

export interface IssuedSession {
  token: string;
  expiresAt: Date;
}

/**
 * Single-admin authentication (decision D2). When `OMNIO_AUTH=none` the service
 * still provisions one real admin row so every user-owned record has a valid
 * owner (docs/architecture/01-system-overview.md §5), and the guard treats all
 * requests as that admin.
 */
@Injectable()
export class AuthService implements OnModuleInit {
  private readonly enabled: boolean;
  private readonly ttlMs: number;
  /** Equalises login timing for unknown usernames (anti-enumeration). */
  private decoyHash: Promise<string> | null = null;

  constructor(
    @Inject(OMNIO_ENV) env: Env,
    private readonly prisma: PrismaService,
  ) {
    this.enabled = env.OMNIO_AUTH === "password";
    this.ttlMs = env.OMNIO_SESSION_TTL_HOURS * 3_600_000;
  }

  async onModuleInit(): Promise<void> {
    if (!this.enabled) {
      await this.ensureSystemUser();
    }
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  async status(current: AuthedUser | null): Promise<AuthStatus> {
    if (!this.enabled) {
      return { needsSetup: false, authenticated: true, username: SYSTEM_USERNAME };
    }
    const adminCount = await this.prisma.user.count();
    return {
      needsSetup: adminCount === 0,
      authenticated: current !== null,
      username: current?.username ?? null,
    };
  }

  async setup(username: string, password: string): Promise<Identity> {
    if (!this.enabled) {
      throw new ConflictException({
        code: "auth_disabled",
        message: "Authentication is disabled.",
      });
    }
    if ((await this.prisma.user.count()) > 0) {
      throw new ConflictException({
        code: "already_setup",
        message: "An administrator account already exists.",
      });
    }
    const passwordHash = await hashPassword(password);
    try {
      const user = await this.prisma.user.create({
        data: { username, passwordHash, isAdmin: true },
      });
      return { username: user.username };
    } catch {
      // Unique-constraint race — another setup won.
      throw new ConflictException({
        code: "already_setup",
        message: "An administrator account already exists.",
      });
    }
  }

  async login(username: string, password: string): Promise<AuthedUser> {
    const user = await this.prisma.user.findUnique({ where: { username } });
    const ok = user
      ? await verifyPassword(user.passwordHash, password)
      : await verifyPassword(await this.getDecoyHash(), password);
    if (!user || !ok) {
      throw new UnauthorizedException({
        code: "invalid_credentials",
        message: "Incorrect username or password.",
      });
    }
    return { id: user.id, username: user.username };
  }

  /** Issues a fresh session, rotating away any token the caller held. */
  async issueSession(userId: string, meta: SessionMeta): Promise<IssuedSession> {
    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + this.ttlMs);
    await this.prisma.session.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        expiresAt,
        userAgent: meta.userAgent,
        ip: meta.ip,
      },
    });
    return { token, expiresAt };
  }

  async revokeSession(token: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }

  /** Resolves a cookie token to its user, sliding `lastSeenAt`; null if invalid. */
  async resolveSession(token: string): Promise<AuthedUser | null> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });
    if (!session) return null;
    if (session.expiresAt.getTime() <= Date.now()) {
      await this.prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
      return null;
    }
    await this.prisma.session
      .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
      .catch(() => undefined);
    return { id: session.user.id, username: session.user.username };
  }

  /** The singleton admin used when auth is disabled. */
  async systemUser(): Promise<AuthedUser> {
    const user = await this.ensureSystemUser();
    return { id: user.id, username: user.username };
  }

  private async ensureSystemUser(): Promise<{ id: string; username: string }> {
    const existing = await this.prisma.user.findFirst();
    if (existing) return existing;
    // No usable password: auth is disabled, so this hash is never verified.
    const passwordHash = await hashPassword(generateSessionToken());
    return this.prisma.user.create({
      data: { username: SYSTEM_USERNAME, passwordHash, isAdmin: true },
    });
  }

  private getDecoyHash(): Promise<string> {
    this.decoyHash ??= hashPassword(generateSessionToken());
    return this.decoyHash;
  }
}

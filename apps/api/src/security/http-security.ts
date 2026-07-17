import type { NestExpressApplication } from "@nestjs/platform-express";
import type { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import type { Env } from "../env";

/**
 * Response hardening for the api surface (docs/architecture/06-security.md §4).
 * The api serves JSON and file downloads only — never inline HTML — so its CSP
 * is `default-src 'none'`. The SPA's nonce-based script CSP lives in the web
 * shell. HSTS is emitted only under TLS (production).
 */
export function configureHttpSecurity(app: NestExpressApplication, env: Env): void {
  if (env.OMNIO_TRUST_PROXY) {
    app.set("trust proxy", true);
  }

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          "default-src": ["'none'"],
          "frame-ancestors": ["'none'"],
          "base-uri": ["'none'"],
          "form-action": ["'none'"],
        },
      },
      referrerPolicy: { policy: "no-referrer" },
      frameguard: { action: "deny" },
      crossOriginResourcePolicy: { policy: "same-site" },
      hsts: env.NODE_ENV === "production" ? { maxAge: 15_552_000, includeSubDomains: true } : false,
    }),
  );

  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), browsing-topics=()",
    );
    next();
  });

  app.enableCors({
    origin: env.OMNIO_ALLOWED_ORIGINS.length > 0 ? env.OMNIO_ALLOWED_ORIGINS : false,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });
}

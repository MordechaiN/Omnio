import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import {
  hasDocker,
  runEchoJob,
  sweepScratch,
  startHarness,
  TEST_ORIGIN,
  type Harness,
} from "./harness";

const describeIf = hasDocker() ? describe : describe.skip;

describeIf("M3 core platform lifecycle", () => {
  let h: Harness;
  let cookie: string;

  beforeAll(async () => {
    h = await startHarness();
  }, 180_000);

  afterAll(async () => {
    await h?.stop();
  });

  it("runs first-run setup and issues a session", async () => {
    const status = await request(h.server).get("/api/v1/auth/status");
    expect(status.body).toMatchObject({ needsSetup: true, authenticated: false });

    const setup = await request(h.server)
      .post("/api/v1/auth/setup")
      .set("Origin", TEST_ORIGIN)
      .send({ username: "admin", password: "correct horse battery staple" });
    expect(setup.status).toBe(201);
    cookie = setup.headers["set-cookie"][0];
    expect(cookie).toContain("omnio_session=");
  });

  it("rejects a mutation with a foreign Origin (CSRF)", async () => {
    const res = await request(h.server)
      .post("/api/v1/auth/login")
      .set("Origin", "http://evil.example")
      .send({ username: "admin", password: "correct horse battery staple" });
    expect(res.status).toBe(403);
  });

  it("requires authentication for protected routes", async () => {
    expect((await request(h.server).get("/api/v1/auth/me")).status).toBe(401);
    const me = await request(h.server).get("/api/v1/auth/me").set("Cookie", cookie);
    expect(me.body).toEqual({ username: "admin" });
  });

  it("sets hardened security headers", async () => {
    const res = await request(h.server).get("/api/v1/system/info");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["referrer-policy"]).toBe("no-referrer");
    expect(res.headers["content-security-policy"]).toContain("default-src 'none'");
    expect(res.headers["x-frame-options"]).toBe("DENY");
  });

  it("carries a file through upload → job → download → sweep", async () => {
    const upload = await request(h.server)
      .post("/api/v1/files")
      .set("Cookie", cookie)
      .set("Origin", TEST_ORIGIN)
      .attach("file", Buffer.from("omnio integration payload"), "note.txt");
    expect(upload.status).toBe(201);
    const inputId: string = upload.body.id;
    expect(upload.body.area).toBe("scratch");

    const created = await request(h.server)
      .post("/api/v1/jobs")
      .set("Cookie", cookie)
      .set("Origin", TEST_ORIGIN)
      .send({ moduleId: "core", toolId: "echo", inputFileIds: [inputId] });
    expect(created.status).toBe(201);
    expect(created.body.status).toBe("queued");

    await runEchoJob(h.prisma, h.storage, created.body.id, 60_000);

    const done = await request(h.server)
      .get(`/api/v1/jobs/${created.body.id}`)
      .set("Cookie", cookie);
    expect(done.body.status).toBe("completed");
    expect(done.body.outputs).toHaveLength(1);

    const outputId: string = done.body.outputs[0];
    const download = await request(h.server)
      .get(`/api/v1/files/${outputId}/content`)
      .set("Cookie", cookie);
    expect(download.status).toBe(200);
    expect(download.headers["content-disposition"]).toContain("attachment");
    expect(download.text).toBe("omnio integration payload");

    // Expire everything and sweep; the objects and rows are gone afterwards.
    await h.prisma.fileObject.updateMany({ data: { ttlAt: new Date(Date.now() - 1000) } });
    const swept = await sweepScratch(h.prisma, h.storage);
    expect(swept).toBeGreaterThanOrEqual(2);
    expect(
      (await request(h.server).get(`/api/v1/files/${outputId}`).set("Cookie", cookie)).status,
    ).toBe(404);
  });

  it("drops analytics events while disabled and records them once enabled", async () => {
    const event = { toolId: "core.echo", tier: "worker", durationBucket: "lt1s", success: true };
    expect(
      (
        await request(h.server)
          .post("/api/v1/analytics/events")
          .set("Cookie", cookie)
          .set("Origin", TEST_ORIGIN)
          .send(event)
      ).status,
    ).toBe(204);
    expect(await h.prisma.toolEvent.count()).toBe(0);

    await h.prisma.setting.create({
      data: { scope: "instance", key: "analytics.enabled", value: true },
    });
    await request(h.server)
      .post("/api/v1/analytics/events")
      .set("Cookie", cookie)
      .set("Origin", TEST_ORIGIN)
      .send(event);
    expect(await h.prisma.toolEvent.count()).toBe(1);
  });
});

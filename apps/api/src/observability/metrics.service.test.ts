import { describe, expect, it } from "vitest";
import { MetricsService } from "./metrics.service";

describe("MetricsService", () => {
  it("renders Prometheus text with default process metrics", async () => {
    const service = new MetricsService();
    const body = await service.render();
    expect(service.contentType).toContain("text/plain");
    expect(body).toContain("process_cpu_user_seconds_total");
    expect(body).toContain('service="omnio-api"');
  });
});

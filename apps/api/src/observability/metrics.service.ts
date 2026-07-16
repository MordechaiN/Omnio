import { Injectable } from "@nestjs/common";
import { collectDefaultMetrics, Registry } from "prom-client";

/**
 * Prometheus-format metrics for the api process. Default process/runtime
 * collectors are registered here; feature metrics (job counts, upload bytes)
 * register against the same registry as they land.
 */
@Injectable()
export class MetricsService {
  readonly registry = new Registry();

  constructor() {
    this.registry.setDefaultLabels({ service: "omnio-api" });
    collectDefaultMetrics({ register: this.registry });
  }

  render(): Promise<string> {
    return this.registry.metrics();
  }

  get contentType(): string {
    return this.registry.contentType;
  }
}

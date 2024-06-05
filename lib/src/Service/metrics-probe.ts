import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { Classification } from "../MetricTypes/metric-classifications";

// exported for attaching to cold start anotation
export const HandlerMetricExport = new Metrics({
  namespace: process.env.POWERTOOLS_METRICS_NAMESPACE,
  serviceName: process.env.POWERTOOLS_SERVICE_NAME,
});

export class MetricsProbe {
  baseMetrics: Metrics;

  constructor() {
    this.baseMetrics = HandlerMetricExport;
  }

  public captureMetric(
    metricName: string,
    unit: MetricUnits,
    metricValue: number
  ) {
    this.baseMetrics.addMetric(metricName, unit, metricValue);
  }

  public captureServiceMetric(
    metricName: string,
    classification: Classification,
    dimensionValue: string,
    unit: MetricUnits,
    metricValue: number
  ) {
    const singleMetric: Metrics = this.baseMetrics.singleMetric();
    singleMetric.addDimension(classification, dimensionValue);
    singleMetric.addMetric(metricName, unit, metricValue);
  }
}

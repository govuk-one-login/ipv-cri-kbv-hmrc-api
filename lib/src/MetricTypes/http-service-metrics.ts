export enum HTTPMetric {
  ResponseLatency = "ResponseLatency",
  HTTPStatusCode = "HTTPStatusCode",
  ResponseValidity = "ResponseValidity",
}

export enum ResponseValidity {
  Valid = 1,
  Invalid = 0,
}

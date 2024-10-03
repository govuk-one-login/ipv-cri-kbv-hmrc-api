export class StopWatch {
  startTime: number = 0;

  public start() {
    this.startTime = Date.now();
  }

  public stop(): number {
    return Date.now() - this.startTime;
  }
}

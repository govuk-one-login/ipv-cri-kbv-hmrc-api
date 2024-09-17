declare module 'multiple-cucumber-html-reporter' {
    interface ReportOptions {
      jsonDir: string;
      reportPath: string;
      openReportInBrowser?: boolean;
      pageTitle?: string;
      reportName?: string;
      displayDuration?: boolean;
    }
  
    export function generate(options: ReportOptions): void;
  }
  
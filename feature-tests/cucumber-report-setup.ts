import { generate } from 'multiple-cucumber-html-reporter';

// Configure the reporter
export default async function globalTeardown() {
  generate({
    jsonDir: './results', // Path to your Cucumber JSON reports
    reportPath: './results', // Path to save the HTML report
    openReportInBrowser: true,
    pageTitle: 'Cucumber Test Report',
    reportName: 'Cucumber Test Report',
    displayDuration: true,
  });
}
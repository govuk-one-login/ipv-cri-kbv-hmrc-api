import { Template } from "aws-cdk-lib/assertions";
const { schema } = require("yaml-cfn");
import { readFileSync } from "fs";
import { load } from "js-yaml";

let template: Template;

describe("Infra", () => {
  beforeAll(() => {
    const yamltemplate: any = load(
      readFileSync("infrastructure/template.yaml", "utf-8"),
      { schema }
    );
    template = Template.fromJSON(yamltemplate);
  });

  it("should define CloudWatch alarms", () => {
    const alarms = template.findResources("AWS::CloudWatch::Alarm");
    expect(Object.keys(alarms).length).toBeGreaterThan(0);
  });

  it("Each CloudWatch alarm should have an AlarmName defined", () => {
    if (!template) return; // Skip test if template failed to load
    const alarms = template.findResources("AWS::CloudWatch::Alarm");
    const alarmList = Object.keys(alarms);
    alarmList.forEach((alarmId) => {
      expect(alarms[alarmId].Properties.AlarmName).toBeTruthy();
    });
  });

  it("Each CloudWatch alarm should have Metrics defined if TreatMissingData is not 'notBreaching'", () => {
    const alarms = template.findResources("AWS::CloudWatch::Alarm");
    const alarmList = Object.keys(alarms);

    alarmList.forEach((alarmId) => {
      const properties = alarms[alarmId].Properties;
      if (properties.TreatMissingData !== "notBreaching") {
        expect(properties.Metrics).toBeTruthy();
      }
    });
  });

  it("Each CloudWatch alarm should have a ComparisonOperator defined", () => {
    const alarms = template.findResources("AWS::CloudWatch::Alarm");
    const alarmList = Object.keys(alarms);
    alarmList.forEach((alarmId) => {
      expect(alarms[alarmId].Properties.ComparisonOperator).toBeTruthy();
    });
  });

  it("Each CloudWatch alarm should have a Threshold defined", () => {
    const alarms = template.findResources("AWS::CloudWatch::Alarm");
    const alarmList = Object.keys(alarms);
    alarmList.forEach((alarmId) => {
      expect(alarms[alarmId].Properties.Threshold).toBeTruthy();
    });
  });

  it("Each CloudWatch alarm should have an EvaluationPeriods defined", () => {
    const alarms = template.findResources("AWS::CloudWatch::Alarm");
    const alarmList = Object.keys(alarms);
    alarmList.forEach((alarmId) => {
      expect(alarms[alarmId].Properties.EvaluationPeriods).toBeTruthy();
    });
  });

  it("Each CloudWatch alarm should have an AlarmActions defined", () => {
    const alarms = template.findResources("AWS::CloudWatch::Alarm");
    const alarmList = Object.keys(alarms);
    alarmList.forEach((alarmId) => {
      expect(alarms[alarmId].Properties.AlarmActions).toBeTruthy();
    });
  });

  it("Each CloudWatch alarm should have OKActions defined", () => {
    const alarms = template.findResources("AWS::CloudWatch::Alarm");
    const alarmList = Object.keys(alarms);
    alarmList.forEach((alarmId) => {
      expect(alarms[alarmId].Properties.OKActions).toBeTruthy();
    });
  });

  it("All CloudWatch alarms should have InsufficientDataActions and DatapointsToAlarm if TreatMissingData is not 'notBreaching'", () => {
    const alarms = template.findResources("AWS::CloudWatch::Alarm");
    Object.keys(alarms).forEach((alarmKey) => {
      const alarm = alarms[alarmKey];
      if (alarm.Properties.TreatMissingData !== "notBreaching") {
        expect(alarm.Properties.InsufficientDataActions).toBeDefined();
        expect(alarm.Properties.DatapointsToAlarm).toBeDefined();
      }
    });
  });
});

import {
  CreateStateMachineCommand,
  CreateStateMachineCommandOutput,
  ExecutionDoesNotExist,
  GetExecutionHistoryCommand,
  GetExecutionHistoryCommandOutput,
  HistoryEvent,
  SFNClient,
  StartExecutionCommand,
  StartExecutionCommandOutput,
  StateMachineType,
} from "@aws-sdk/client-sfn";
import { GenericContainer, StartedTestContainer } from "testcontainers";
import { StepFunctionConstants } from "./sfn-constants";

const MAX_RETRIES = 10;

enum ExecutionStatus {
  success = "ExecutionSucceeded",
  fail = "ExecutionFailed",
}

export class SfnContainerHelper {
  private sfnClient: Promise<SFNClient>;
  private composeEnvironment: Promise<StartedTestContainer>;

  constructor() {
    this.composeEnvironment = this.createTestContainer();
    this.sfnClient = this.createSfnClient();
  }

  public async getContainer(): Promise<StartedTestContainer> {
    const container = await this.composeEnvironment;
    this.copyFileToContainer(container);
    return container;
  }

  public async shutDown(): Promise<void> {
    const container = await this.composeEnvironment;
    await container.stop();
  }

  public async startStepFunctionExecution(
    testName: string,
    stepFunctionInput: string
  ): Promise<StartExecutionCommandOutput> {
    const stateMachineArn = `${
      (await this.createStateMachine()).stateMachineArn as string
    }#${testName}`;
    return (await this.sfnClient).send(
      new StartExecutionCommand({
        stateMachineArn,
        input: stepFunctionInput,
      })
    );
  }

  public async waitFor(
    criteria: (event: HistoryEvent) => boolean,
    executionResponse: StartExecutionCommandOutput,
    sfnClient: Promise<SFNClient> = this.sfnClient
  ): Promise<HistoryEvent[]> {
    const executionHistoryResult = await this.untilExecutionCompletes(
      await sfnClient,
      executionResponse
    );
    return executionHistoryResult?.events?.filter(criteria) as HistoryEvent[];
  }

  private sleep(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  private async copyFileToContainer(
    container: StartedTestContainer
  ): Promise<void> {
    await container.copyFilesToContainer([
      {
        source: StepFunctionConstants.mockFileHostPath,
        target: StepFunctionConstants.mockFileContainerPath,
      },
    ]);
  }

  private async createSfnClient(): Promise<SFNClient> {
    const container = await this.getContainer();
    return new SFNClient({
      endpoint: `http://${container.getHost()}:${container.getMappedPort(
        8083
      )}`,
      credentials: {
        accessKeyId:
          process.env.AWS_ACCESS_KEY_ID ||
          StepFunctionConstants.AWS_ACCESS_KEY_ID,
        secretAccessKey:
          process.env.AWS_SECRET_ACCESS_KEY ||
          StepFunctionConstants.AWS_SECRET_ACCESS_KEY,
        sessionToken: process.env.AWS_SESSION_TOKEN || "local",
      },
      region:
        process.env.AWS_DEFAULT_REGION ||
        StepFunctionConstants.AWS_DEFAULT_REGION,
      disableHostPrefix: true,
    });
  }

  private async createTestContainer(): Promise<StartedTestContainer> {
    const container = await new GenericContainer(
      "amazon/aws-stepfunctions-local"
    )
      .withEnvironment({
        AWS_SECRET_ACCESS_KEY:
          process.env.AWS_SECRET_ACCESS_KEY ||
          StepFunctionConstants.AWS_SECRET_ACCESS_KEY,
        AWS_ACCOUNT_ID:
          process.env.AWS_ACCOUNT_ID || StepFunctionConstants.AWS_ACCOUNT_ID,
        SFN_MOCK_CONFIG:
          process.env.SFN_MOCK_CONFIG ||
          StepFunctionConstants.mockFileContainerPath,
        AWS_DEFAULT_REGION: process.env.AWS_DEFAULT_REGION || "local",
        AWS_ACCESS_KEY_ID:
          process.env.AWS_ACCESS_KEY_ID ||
          StepFunctionConstants.AWS_ACCESS_KEY_ID,
        AWS_SESSION_TOKEN: process.env.AWS_SESSION_TOKEN || "local",
      })
      .withExposedPorts(8083)
      .withStartupTimeout(10_000)
      .start();

    await this.sleep(10_000);
    return container;
  }

  private async createStateMachine(): Promise<CreateStateMachineCommandOutput> {
    const createStateMachineResponse = await (
      await this.sfnClient
    ).send(
      new CreateStateMachineCommand({
        name: StepFunctionConstants.STATE_MACHINE_NAME,
        definition: StepFunctionConstants.STATE_MACHINE_ASL,
        roleArn:
          process.env.STATE_MACHINE_ROLE || StepFunctionConstants.DUMMY_ROLE,
        type: StateMachineType.STANDARD,
      })
    );
    return createStateMachineResponse;
  }

  private async untilExecutionCompletes(
    sfnClient: SFNClient,
    executionResponse: StartExecutionCommandOutput,
    retries = MAX_RETRIES
  ): Promise<GetExecutionHistoryCommandOutput> {
    try {
      const historyResponse = await this.getExecutionHistory(
        sfnClient,
        executionResponse.executionArn
      );
      if (
        this.executionState(historyResponse, ExecutionStatus.success) ||
        this.executionState(historyResponse, ExecutionStatus.fail)
      ) {
        return historyResponse;
      }
      if (retries > 0) {
        await this.sleep(1_000);
        return this.untilExecutionCompletes(
          sfnClient,
          executionResponse,
          retries - 1
        );
      }
      throw new Error(`Execution did not complete successfully`);
    } catch (error) {
      if (
        error instanceof ExecutionDoesNotExist &&
        error.name === "ExecutionDoesNotExist" &&
        retries > 0
      ) {
        await this.sleep(1_000);
        return this.untilExecutionCompletes(
          sfnClient,
          executionResponse,
          retries - 1
        );
      } else {
        await this.sleep(1_000);
        return this.untilExecutionCompletes(
          sfnClient,
          executionResponse,
          retries - 1
        );
      }
    }
  }

  private async getExecutionHistory(
    sfnClient: SFNClient,
    executionArn?: string
  ): Promise<GetExecutionHistoryCommandOutput> {
    return await sfnClient.send(
      new GetExecutionHistoryCommand({
        executionArn,
      })
    );
  }

  private executionState(
    history: GetExecutionHistoryCommandOutput,
    state: string
  ): boolean {
    return (
      history?.events?.filter((event) => event.type === state).length === 1
    );
  }
}

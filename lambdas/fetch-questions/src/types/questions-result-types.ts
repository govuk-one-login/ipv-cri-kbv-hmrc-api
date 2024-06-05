export class Info {
  readonly taxYearCurrent: string | undefined;
  readonly taxYearPrevious: string | undefined;

  constructor(taxYearCurrent: string, taxYearPrevious: string | undefined) {
    this.taxYearCurrent = taxYearCurrent;
    this.taxYearPrevious = taxYearPrevious;
  }
}

export class Question {
  readonly questionKey: string;
  readonly info: Info | undefined;

  constructor(
    questionKey: string,
    taxYearCurrent: string | undefined,
    taxYearPrevious: string | undefined
  ) {
    this.questionKey = questionKey;

    this.info = taxYearCurrent
      ? new Info(taxYearCurrent, taxYearPrevious)
      : undefined;
  }
}

export class QuestionsResult {
  readonly correlationId: string;
  readonly questions: Question[];

  constructor(correlationId: string, questions: Question[]) {
    this.correlationId = correlationId;
    this.questions = questions;
  }

  getCorrelationId(): string {
    return this.correlationId;
  }

  getQuestionCount(): number {
    return this.questions.length;
  }
}

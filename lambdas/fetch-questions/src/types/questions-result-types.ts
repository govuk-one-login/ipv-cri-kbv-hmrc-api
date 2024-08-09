export class Info {
  readonly currentTaxYear: string | undefined;
  readonly previousTaxYear: string | undefined;

  constructor(
    currentTaxYear: string | undefined,
    previousTaxYear: string | undefined
  ) {
    this.currentTaxYear = currentTaxYear;
    this.previousTaxYear = previousTaxYear;
  }
}

export class Question {
  readonly questionKey: string;
  readonly info: Info | undefined;

  constructor(
    questionKey: string,
    currentTaxYear: string | undefined,
    previousTaxYear: string | undefined
  ) {
    this.questionKey = questionKey;

    this.info = currentTaxYear
      ? new Info(currentTaxYear, previousTaxYear)
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

export class QuestionResultItem {
  sessionId: string;
  correlationId: string;
  expiryDate: number;
  questions: QuestionResultItemQuestion[];

  constructor(
    sessionId: string,
    correlationId: string,
    expiryDate: number,
    questions: QuestionResultItemQuestion[]
  ) {
    this.sessionId = sessionId;
    this.correlationId = correlationId;
    this.expiryDate = expiryDate;
    this.questions = questions;
  }
}

export class QuestionResultItemInfo {
  currentTaxYear: string | undefined;
  previousTaxYear: string | undefined;

  constructor(
    currentTaxYear: string | undefined,
    previousTaxYear: string | undefined
  ) {
    this.currentTaxYear = currentTaxYear;
    this.previousTaxYear = previousTaxYear;
  }
}

export class QuestionResultItemQuestion {
  questionKey: string;
  info: QuestionResultItemInfo;
  answered: boolean;
  order: number;

  constructor(
    questionKey: string,
    info: QuestionResultItemInfo,
    answered: boolean,
    order: number
  ) {
    this.questionKey = questionKey;
    this.info = info;
    this.answered = answered;
    this.order = order;
  }
}

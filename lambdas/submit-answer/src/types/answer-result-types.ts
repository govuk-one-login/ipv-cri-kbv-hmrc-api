export class SubmitAnswerResult {
  readonly questionKey: string;
  readonly status: string;

  constructor(questionKey: string, answerStatus: string) {
    this.questionKey = questionKey;
    this.status = answerStatus;
  }
}

export class Answer {
  readonly questionKey: string;
  readonly answer: string;

  constructor(questionKey: string, answer: string) {
    this.questionKey = questionKey;
    this.answer = answer;
  }
}

export class AnswerResultItem {
  sessionId: string;
  correlationId: string;
  ttl: number;
  answers: SubmitAnswerResult[];
  verificationScore: number;
  ci?: Array<string>;
  checkDetailsCount?: number;
  failedCheckDetailsCount?: number;

  constructor(
    sessionId: string,
    correlationId: string,
    ttl: number,
    answers: SubmitAnswerResult[],
    verificationScore: number,
    checkDetailsCount?: number,
    failedCheckDetailsCount?: number,
    ci?: Array<string>
  ) {
    this.sessionId = sessionId;
    this.correlationId = correlationId;
    this.ttl = ttl;
    this.answers = answers;
    this.verificationScore = verificationScore;
    this.checkDetailsCount = checkDetailsCount;
    this.failedCheckDetailsCount = failedCheckDetailsCount;
    this.ci = ci;
  }
}

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

  constructor(
    sessionId: string,
    correlationId: string,
    ttl: number,
    answers: SubmitAnswerResult[]
  ) {
    this.sessionId = sessionId;
    this.correlationId = correlationId;
    this.ttl = ttl;
    this.answers = answers;
  }
}

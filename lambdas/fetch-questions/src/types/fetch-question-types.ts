export interface FetchQuestionInputs {
  sessionId: string;
  sessionTtl: number;
  questionsUrl: string;
  userAgent: string;
  bearerToken: string;
  nino: string;
  sessionItem: any;
}

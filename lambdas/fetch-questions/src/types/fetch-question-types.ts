export interface FetchQuestionInputs {
  sessionId: string;
  sessionTtl: number;
  questionsUrl: string;
  userAgent: string;
  issuer: string;
  bearerToken: string;
  nino: string;
  sessionItem: any;
}

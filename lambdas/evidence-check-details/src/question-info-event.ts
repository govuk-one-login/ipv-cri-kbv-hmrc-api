export type QuestionInfo = {
  questionKey?: {
    S: string;
  };
  score?: {
    S: "correct" | "incorrect";
  };
  answered?: {
    S: "true" | "false";
  };
  correlationId?: {
    S: string;
  };
  sessionId?: {
    S: string;
  };
  info?: {
    M: Record<string, { S: string }>;
  };
};

export type Response<T> = {
  questionResponseEvent: {
    Count: number;
    Items?: Array<T> | unknown;
  };
};

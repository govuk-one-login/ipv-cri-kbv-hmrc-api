import { mock } from "jest-mock-extended";
import { Context } from "aws-lambda";
import { MetricsProbe } from "../../../lib/src/Service/metrics-probe";
import { SubmitAnswerService } from "../src/services/submit-answer-service";
import { ResultsService } from "../src/services/results-service";
import { SubmitAnswerHandler } from "../src/submit-answer-handler";
import { SubmitAnswerResult } from "../src/types/answer-result-types";

const metricsProbe = mock<MetricsProbe>();
const submitAnswerService = mock<SubmitAnswerService>();
const answerResultsService = mock<ResultsService>();

describe("submit-answer-handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  const mockEventInput = {
    inputAnswer: "34334.34",
    validated: true,
    answeredQuestionKey: "rti-p60-statutory-shared-parental-pay",
    sessionId: "94fcd1ae-3c2e-4570-9365-c57f82f6974c",
    sessionItem: {
      Item: {
        expiryDate: {
          N: "1724173653",
        },
        clientIpAddress: {
          S: "51.149.8.131",
        },
        redirectUri: {
          S: "http://localhost:8085/callback",
        },
        clientSessionId: {
          S: "3cf8ef50-b4d1-4952-b76a-35379a6052a8",
        },
        createdDate: {
          N: "1724166453757",
        },
        clientId: {
          S: "ipv-core-stub-aws-build",
        },
        subject: {
          S: "urn:fdc:gov.uk:2022:cf7bf76b-86d9-468e-942e-031cf68c55b0",
        },
        persistentSessionId: {
          S: "39156017-152f-4584-8772-77fdd27b7879",
        },
        attemptCount: {
          N: "0",
        },
        sessionId: {
          S: "94fcd1ae-3c2e-4570-9365-c57f82f6974c",
        },
        state: {
          S: "state-123456789",
        },
      },
    },
    usersQuestions: {
      Count: 1,
      Items: [
        {
          expiryDate: {
            N: "1724173653",
          },
          questions: {
            L: [
              {
                M: {
                  questionKey: {
                    S: "tc-amount",
                  },
                  answered: {
                    Bool: true,
                  },
                  info: {
                    M: {},
                  },
                  order: {
                    N: "0",
                  },
                },
              },
              {
                M: {
                  questionKey: {
                    S: "sa-income-from-pensions",
                  },
                  answered: {
                    Bool: true,
                  },
                  info: {
                    M: {},
                  },
                  order: {
                    N: "1",
                  },
                },
              },
              {
                M: {
                  questionKey: {
                    S: "rti-p60-statutory-shared-parental-pay",
                  },
                  answered: {
                    Bool: false,
                  },
                  info: {
                    M: {
                      currentTaxYear: {
                        S: "2024/25",
                      },
                      previousTaxYear: {
                        S: "2023/24",
                      },
                    },
                  },
                  order: {
                    N: "2",
                  },
                },
              },
            ],
          },
          correlationId: {
            S: "3a7e253c-15a5-41d0-b247-5e794f1cf589",
          },
          sessionId: {
            S: "94fcd1ae-3c2e-4570-9365-c57f82f6974c",
          },
        },
      ],
      ScannedCount: 1,
    },
    answers: [
      {},
      {},
      {
        M: {
          questionKey: "rti-p60-statutory-shared-parental-pay",
          answer: "34334.34",
        },
      },
    ],
    dynamoResult: {
      Item: {
        expiryDate: {
          N: "1724173653",
        },
        answers: {
          L: [
            {
              M: {
                questionKey: {
                  S: "tc-amount",
                },
                answer: {
                  S: "34343.34",
                },
              },
            },
            {
              M: {
                questionKey: {
                  S: "sa-income-from-pensions",
                },
                answer: {
                  S: "10686",
                },
              },
            },
          ],
        },
        correlationId: {
          S: "3a7e253c-15a5-41d0-b247-5e794f1cf589",
        },
        sessionId: {
          S: "94fcd1ae-3c2e-4570-9365-c57f82f6974c",
        },
      },
    },
    answeredQuestionsMap: [
      {
        M: {
          answered: {
            BOOL: true,
          },
          questionKey: {
            S: "tc-amount",
          },
          info: {
            M: {},
          },
          order: {
            N: "0",
          },
        },
      },
      {
        M: {
          answered: {
            BOOL: true,
          },
          questionKey: {
            S: "sa-income-from-pensions",
          },
          info: {
            M: {},
          },
          order: {
            N: "1",
          },
        },
      },
      {
        M: {
          answered: {
            BOOL: true,
          },
          questionKey: {
            S: "rti-p60-statutory-shared-parental-pay",
          },
          info: {
            M: {
              currentTaxYear: {
                S: "2024/25",
              },
              previousTaxYear: {
                S: "2023/24",
              },
            },
          },
          order: {
            N: "2",
          },
        },
      },
    ],
    arrayLengths: {
      answeredQuestionsLength: 3,
      totalQuestionsLength: 3,
    },
    parameters: {
      otgApiUrl: {
        value: "https://otg.gov.uk",
      },
      url: {
        value: "https://hmrc.gov.uk",
      },
      userAgent: {
        value: "govuk-one-login",
      },
    },
  };

  describe("happy path scenarios", () => {
    it("it should return the response from the HMRC API", async () => {
      const hmrcResponse = {
        messsage: "AnswerResults Saved",
      };
      global.fetch = jest.fn();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce(hmrcResponse),
      });
      const submitAnswerHandler = new SubmitAnswerHandler(
        metricsProbe,
        submitAnswerService,
        answerResultsService
      );
      const submitAnswerResultArray: SubmitAnswerResult[] = [
        new SubmitAnswerResult("questionKey1", "correct"),
        new SubmitAnswerResult("questionKey2", "incorrect"),
      ];

      submitAnswerService.checkAnswers.mockResolvedValue(
        submitAnswerResultArray
      );
      const result = await submitAnswerHandler.handler(
        mockEventInput,
        {} as Context
      );
      expect(result).toEqual(hmrcResponse);
    });
  });
});

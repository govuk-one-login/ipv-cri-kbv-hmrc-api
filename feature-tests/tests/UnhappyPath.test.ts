import {
  getClaimsUrl,
  postUpdatedClaimsUrl,
  postRequestToSessionEndpoint,
  postRequestToHmrcKbvEndpoint,
  getRequestToQuestionEndpoint,
  postRequestToAnswerEndpoint,
} from "./ApiTestSteps";
import { randomUUID } from "crypto";

describe("HMRC KBV UnHappy Path", () => {
  let clientId: string;
  let state: string;
  let sessionId: string;

  describe.each(["AA000002A"])("NINO: %s", (selectedNino: string) => {
    it(`Invalid Request to /answer endpoint for ${selectedNino}`, async () => {
      // Generate Shared Claims URL Response
      const generateClaimsUrlResponse = await getClaimsUrl(selectedNino);

      // Post Updates Claims URL Response
      const postUpdatedClaimsUrlResponse = await postUpdatedClaimsUrl(
        generateClaimsUrlResponse.data
      );
      clientId = postUpdatedClaimsUrlResponse.data.client_id;

      // Start HMRC KBV Session
      const sessionResponse = await postRequestToSessionEndpoint(
        postUpdatedClaimsUrlResponse.data
      );
      state = sessionResponse.data.state;
      sessionId = sessionResponse.data.session_id;

      // Fetch HRMC KBV Questions
      await postRequestToHmrcKbvEndpoint(sessionId);

      // Answer Question 1
      const getQuestionResponse = await getRequestToQuestionEndpoint(
        sessionId,
        200
      );

      // Simulate an invalid session ID
      const invalidSessionId = randomUUID();
      const answerResponse = await postRequestToAnswerEndpoint(
        getQuestionResponse.data.questionKey,
        invalidSessionId
      );

      // Expect a 500 status for the invalid request
      expect(answerResponse.status).toBe(500);
    });
  });
});

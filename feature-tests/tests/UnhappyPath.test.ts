import {
  getClaimsUrl,
  postUpdatedClaimsUrl,
  postRequestToSessionEndpoint,
  postRequestToHmrcKbvEndpoint,
  getRequestToQuestionEndpoint,
  postRequestToAnswerEndpoint,
  getDbRecordBySessionId,
} from "./ApiTestSteps";
import { randomUUID } from "crypto";

describe("HMRC KBV UnHappy Path", () => {
  let clientId: string;
  let state: string;
  let sessionId: string;

  it.each(["AA000002A"])(
    "Invalid Request to /answer endpoint for $selectedNino",
    async (selectedNino: string) => {
      const resultsRecord = await getDbRecordBySessionId("fd508a7d-f6f5-4faf-a708-c02e56db3f10", "questions-table-ipv-cri-hmrc-kbv-api-cbgds-main");
      console.log(resultsRecord);
//       // Generate Shared Claims URL Response
//       const generateClaimsUrlResponse = await getClaimsUrl(selectedNino);
//       // Post Updates Claims URL Response
//       const postUpdatedClaimsUrlResponse = await postUpdatedClaimsUrl(
//         generateClaimsUrlResponse.data
//       );
//       clientId = postUpdatedClaimsUrlResponse.data.client_id;
//       // Start HMRC KBV Session
//       const sessionResponse = await postRequestToSessionEndpoint(
//         postUpdatedClaimsUrlResponse.data
//       );
//       state = sessionResponse.data.state;
//       sessionId = sessionResponse.data.session_id;
//       // Fetch HRMC KBV Questions
//       await postRequestToHmrcKbvEndpoint(sessionId);
//       // Answer Question 1
//       const getQuestionResponse = await getRequestToQuestionEndpoint(
//         sessionId,
//         200
//       );
//       const invalidSessionId = randomUUID();
//       const answerResponse = await postRequestToAnswerEndpoint(
//         getQuestionResponse.data.questionKey,
//         invalidSessionId
//       );
//       expect(answerResponse.status).toBe(500);
    }
  );
});

Feature: HMRC-KBV-POST-Answer-HappyPath.feature

    @pre-merge @hmrc-answer
    Scenario Outline: Happy Path - Post request to /answer Endpoint for nino <selectedNino> with >=3 questions over 2 questionKeys
        Given I send a new answer request to the core stub with nino value <selectedNino>
        Given I send a valid POST request with <contentType> and <accept> to the fetchQuestions endpoint with status code <statusCode>
        When I send a first GET request to the question endpoint followed by a POST request to the answer endpoint with the correct answerKey
        And I send a second GET request to the question endpoint followed by a POST request to the answer endpoint
        And I send a third GET request to the question endpoint followed by a POST request to the answer endpoint
        Then I should receive a valid response with statusCode <statusCode> from the answers endpoint
        Then I should receive a final valid response with statusCode <finalStatusCode> from the questions endpoint
        And I should receive a VC with the correct values <verificationScore> for <selectedNino> with >=3 questions over 2 questionKey
        Examples:
            | contentType      | accept           | statusCode | finalStatusCode | selectedNino | verificationScore     |
            | application/json | application/json | 200        | 204             | KE000000C    | "verificationScore":2 |
            | application/json | application/json | 200        | 204             | AA000000A    | "verificationScore":2 |
            | application/json | application/json | 200        | 204             | AA000003A    | "verificationScore":2 |
            | application/json | application/json | 200        | 204             | AA000004A    | "verificationScore":2 |
            | application/json | application/json | 200        | 204             | AA000005A    | "verificationScore":2 |
            | application/json | application/json | 200        | 204             | AA000006A    | "verificationScore":2 |
            | application/json | application/json | 200        | 204             | AA000003I    | "verificationScore":2 |
            | application/json | application/json | 200        | 204             | AA000003C    | "verificationScore":0 |
            | application/json | application/json | 200        | 204             | AA000003Z    | "verificationScore":0 |

    @pre-merge @hmrc-answer
    Scenario Outline: Happy Path - Post request to /answer Endpoint for nino <selectedNino> with 2 questions over 2 questionKeys
        Given I send a new request to the core stub with nino value <selectedNino> for a user with 2 questions
        Given I send a valid 2 question POST request with <contentType> and <accept> to the fetchQuestions endpoint with status code <statusCode>
        When I send the first GET request to the question endpoint followed by a POST request to the answer endpoint
        And I send a second GET request to the question endpoint followed by a final POST request to the answer endpoint
        Then I should receive the final valid response with statusCode <finalStatusCode> from the questions endpoint for a user with 2 questions answered correctly
        And I should receive a VC with the correct values <verificationScore> for <selectedNino> with 2 questions over 2 question keys
        Examples:
            | contentType      | accept           | statusCode | finalStatusCode | selectedNino | verificationScore     |
            | application/json | application/json | 200        | 204             | AA000002A    | "verificationScore":2 |
            | application/json | application/json | 200        | 204             | AA000002Z    | "verificationScore":0 |
            | application/json | application/json | 200        | 204             | AA000002C    | "verificationScore":0 |


    @pre-merge @hmrc-answer
    Scenario Outline: Happy Path - Post request to /answer Endpoint for nino <selectedNino> with 3 questions including 1 low confidence question
        Given I send a new request to the core stub with nino value <selectedNino> for a user with 3 questions including 1 low confidence question
        Given I send a POST request with <contentType> and <accept> to the fetchQuestions endpoint with status code <statusCode>
        When I send a GET request for a medium confidence question to the question endpoint followed by a POST request to the answer endpoint
        And I send a second GET request for a medium confidence question to the question endpoint followed by a final POST request to the answer endpoint
        Then I should receive the final valid response with statusCode <finalStatusCode> from the questions endpoint for a user with 2 medium confidence questions
        And I should receive a VC with the correct values <verificationScore> for <selectedNino> with 2 medium confidence questions over 2 question keys
        Examples:
            | contentType      | accept           | statusCode | finalStatusCode | selectedNino | verificationScore     |
            | application/json | application/json | 200        | 204             | AA000031L    | "verificationScore":2 |

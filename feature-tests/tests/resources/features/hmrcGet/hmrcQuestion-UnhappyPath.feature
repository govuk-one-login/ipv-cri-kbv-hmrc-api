Feature: HMRC-KBV-GET-Question-UnhappyPath.feature

    @pre-merge @hmrc-question
    Scenario Outline: Unhappy Path - Get request to /question Endpoint - Invalid header Values - sessionId
        Given I send a new questions request to the core stub with a nino value <selectedNino>
        When I send a new questions POST request with <contentType> and <accept> to the fetchQuestions endpoint
        When I send a GET request to the question endpoint with a invalid sessionId <session_id>
        Then I should receive the appropriate response with statusCode <statusCode>
        Examples:
            | contentType      | accept           | statusCode | selectedNino | session_id                           |
            | application/json | application/json | 500        | KE000000C    | 44443939-4cf4-41e9-9fee-231e16e9f382 |

    @pre-merge @hmrc-question
    Scenario Outline: Unhappy Path - Get request to /question Endpoint - Invalid header Values - contentType and accept
        Given I send a valid questions request to the core stub with nino value <selectedNino>
        When I send a GET request to the question endpoint with a invalid <contentType> and <accept>
        Then I should receive the appropriate response for the invalid headers with statusCode <statusCode>
        Examples:
            | contentType      | accept           | statusCode | selectedNino | response               |
            | text/html        | application/json | 415        | KE000000C    | Unsupported Media Type |
            | application/json | text/html        | 500        | KE000000C    | Invalid request body   |

Feature: HMRC-KBV-POST-Answer-UnhappyPath.feature

    @pre-merge @regression
    Scenario Outline: Unhappy Path - Post request to /answer Endpoint - Invalid Header Values - sessionId
        Given I send a request to the core stub with nino value <selectedNino>
        Given I send a valid POST request with <contentType> and <accept> to the fetchQuestions endpoint
        When I send a valid GET request to the question endpoint
        And I send a POST request to the question endpoint with a invalid sessionId <session_id>
        Then I should receive the appropriate response for the invalid header value with statusCode <statusCode>
        Examples:
            | contentType      | accept           | statusCode | selectedNino | session_id                           |
            | application/json | application/json | 500        | AA000002A    | 44443939-4cf4-41e9-9fee-231e16e9f382 |

    @pre-merge
    Scenario Outline: Unhappy Path - Post request to /answer Endpoint - Invalid Header Values
        Given I send a valid request to the core stub with nino value <selectedNino>
        And I send a POST request to the question endpoint with invalid <contentType> and <accept>
        Then I should receive the appropriate response for the invalid headers value with statusCode <statusCode> and <responseMessage>
        Examples:
            | contentType      | accept           | statusCode | selectedNino | responseMessage        |
            | text/html        | application/json | 415        | AA000002A    | Unsupported Media Type |
            | application/json | text/html        | 400        | AA000002A    | Invalid request body |

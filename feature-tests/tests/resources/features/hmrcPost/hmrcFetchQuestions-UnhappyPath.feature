Feature: HMRC-KBV-GET-FetchQuestions-UnhappyPath.feature

    @pre-merge @hmrc-fetchquestions
    Scenario Outline: Unhappy Path - Post Request to /fetchquestions Endpoint - Invalid Header Values - sessionId
        Given I send a valid fetchquestions request to the core stub with nino value <selectedNino>
        When I send a POST request with <contentType> and <accept> to the fetchQuestions endpoint with a invalid sessionId <session_id>
        Then I should receive the appropriate response and statusCode <statusCode> from the fetchquestions endpoint when using invalid sessionId
        Examples:
            | contentType      | accept           | statusCode | selectedNino | session_id                           |
            | application/json | application/json | 403        | KE000000C    | 44443939-4cf4-41e9-9fee-231e16e9f382 |

    @failing-regression @hmrc-fetchquestions
    Scenario Outline: Unhappy Path - Post Request to /fetchquestions Endpoint - Invalid Header Values
        Given I send a new valid fetchquestions request to the core stub with nino value <selectedNino>
        When I send a POST request with invalid headers <contentType> and <accept> to the fetchQuestions endpoint
        Then I should receive the appropriate response and statusCode <statusCode> from the fetchquestions endpoint when using invalid headers
        Examples:
            | contentType      | accept           | statusCode | selectedNino |
            | text/html        | application/json | 403        | KE000000C    |
            | application/json | text/html        | 403        | KE000000C    |
Feature: HMRC-KBV-POST-Session-HappyPath.feture

    Scenario Outline: Happy Path - Post Request to Session Endpoint
        Given I send a Valid POST request to the session endpoint with <contentType> and <accept> and <xForwardedFor>
        Then I should receive a response with <statusCode>
        Examples:
            | statusCode | contentType      | accept           | xForwardedFor |
            | 202        | application/json | application/json | 123456789       |
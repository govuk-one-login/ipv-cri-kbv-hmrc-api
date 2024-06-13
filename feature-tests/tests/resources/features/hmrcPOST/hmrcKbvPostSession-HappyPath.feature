Feature: HMRC-KBV-POST-Session-HappyPath.feture

    @test
    Scenario Outline: Happy Path - Post Request to Session Endpoint
        Given I send a Valid POST request for <user> to the session endpoint with <contentType> and <accept> and <xForwardedFor>
        Then I should receive a response with <statusCode> and valid sessionId
        Examples:
            | user              | contentType      | accept           | xForwardedFor | statusCode |
            | updatedUserString | application/json | application/json | 123456789     | 202        |
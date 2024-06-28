Feature: HMRC-KBV-GET-Authorization-HappyPath.feture

    @test
    Scenario Outline: Happy Path - Get Request to Authorization Endpoint for redirect_uri
        Given I have obtained a valid user claim from the CoreStub
        When I send a POST request to the fetchQuestions endpoint
        # Then I should receive a response with <statusCode> and valid sessionId
        Examples:
            | contentType      | accept           | statusCode |
            | application/json | application/json | 200        |

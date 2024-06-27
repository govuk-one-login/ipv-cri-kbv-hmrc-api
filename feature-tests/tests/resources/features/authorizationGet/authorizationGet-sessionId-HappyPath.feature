Feature: HMRC-KBV-GET-Authorization-HappyPath.feture

    @test
    Scenario Outline: Happy Path - Get Request to Authorization Endpoint for redirect_uri
        Given I have obtained a valid user claim from the CoreStub
        # When I send a Get request to the Authorization endpoint with headers <contentType> and <accept>
        # Then I should receive a response with <statusCode> and valid sessionId
        Examples:
            | contentType      | accept | statusCode |
            | application/json | */*    | 200        |

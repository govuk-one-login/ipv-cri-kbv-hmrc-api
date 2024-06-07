Feature: HMRC-KBV-GET-Authorization-HappyPath.feture

    Scenario Outline: Happy Path - Get Request to Authorization Endpoint for sessionId
        Given I send a Get request to the Authorization endpoint with headers <contentType> and <accept>
        Then I should receive a response with <statusCode> and valid <sessionId>
        Examples:
            | contentType      | accept | statusCode |
            | application/json | */*    | 202        |
Feature: HMRC-KBV-GET-Question-HappyPath.feature

    Scenario Outline: Happy Path - Get request to /question Endpoint for userId
        Given I send a POST request with <contentType> and <accept> to the fetchQuestions endpoint
        When I send a GET request to the question endpoint
        Then I should receive a valid response with statusCode <statusCode> from the questions endpoint
        Examples:
            | contentType      | accept           | statusCode |
            | application/json | application/json | 200        |

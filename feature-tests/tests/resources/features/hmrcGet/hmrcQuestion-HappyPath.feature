Feature: HMRC-KBV-GET-Question-HappyPath.feature

    @pre-merge @hmrc-question
    Scenario Outline: Happy Path - Get request to /question Endpoint for userId with Nino <selectedNino>
        Given I send a new questions request to the core stub with nino value <selectedNino>
        When I send a questions POST request with <contentType> and <accept> to the fetchQuestions endpoint
        When I send a GET request to the question endpoint
        Then I should receive a valid response with statusCode <statusCode> from the questions endpoint
        Examples:
            | contentType      | accept           | statusCode | selectedNino |
            | application/json | application/json | 200        | KE000000C    |

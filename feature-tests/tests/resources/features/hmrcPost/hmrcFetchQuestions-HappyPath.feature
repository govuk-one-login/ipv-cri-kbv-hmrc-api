Feature: HMRC-KBV-GET-FetchQuestions-HappyPath.feature

    Scenario Outline: Happy Path - Post Request to /fetchquestions Endpoint for userId
        Given I send a new fetchquestions request to the core stub with nino value <selectedNino>
        When I send a POST request with <contentType> and <accept> to the fetchQuestions endpoint
        Then I should receive a valid response and statusCode <statusCode> from the fetchquestions endpoint
        Examples:
            | contentType      | accept           | statusCode | selectedNino |
            | application/json | application/json | 200        | KE000000C    |

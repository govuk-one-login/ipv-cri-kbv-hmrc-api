Feature: CORE-STUB-CreateSessionRequest-HappyPath.feature

    Scenario Outline: Happy Path - Request for user claimSet from CoreStub for Valid User
        Given I send a new core stub request to the core stub with nino value <selectedNino>
        When I send a new POST request with <contentType> and <accept> to the fetchQuestions endpoint
        Then I wait for the Lambda to warm up
        Examples:
            | contentType      | accept           | selectedNino |
            | application/json | application/json | KE000000C    |

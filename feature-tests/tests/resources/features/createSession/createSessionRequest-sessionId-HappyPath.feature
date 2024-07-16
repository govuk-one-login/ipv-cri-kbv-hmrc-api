Feature: CORE-STUB-CreateSessionRequest-HappyPath.feature

    Scenario Outline: Happy Path - Request for user claimSet from CoreStub for Valid User
        Given I send a new POST request with <contentType> and <accept> to the fetchQuestions endpoint
        Then I wait for the Lambda to warm up
        Examples:
            | contentType      | accept           |
            | application/json | application/json |
            
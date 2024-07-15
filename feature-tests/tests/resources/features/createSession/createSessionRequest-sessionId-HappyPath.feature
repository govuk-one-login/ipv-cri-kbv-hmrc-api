Feature: CORE-STUB-CreateSessionRequest-HappyPath.feature

    Scenario Outline: Happy Path - Request for user claimSet from CoreStub for Valid User
        Given I send a GET request to the CoreStub for a Valid UserId
        Then I should receive a response with statusCode and user claimSet
        Examples:
            | statusCode |
            | 201        |

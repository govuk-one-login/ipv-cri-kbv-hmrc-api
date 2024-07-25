Feature: CORE-STUB-CreateSessionRequest-HappyPath.feature

    @pre-merge
    Scenario Outline: Happy Path - Request for user claimSet from CoreStub for Valid User
        Given I send a new core stub request to the core stub with nino value <selectedNino>
        Examples:
            | selectedNino |
            | KE000000C    |

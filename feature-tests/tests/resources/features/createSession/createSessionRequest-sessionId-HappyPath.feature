Feature: CORE-STUB-CreateSessionRequest-HappyPath.feature

    @pre-merge @hmrc-corestub
    Scenario Outline: Happy Path - Request for user claimSet from CoreStub for Valid User with Nino <selectedNino>
        Given I send a new core stub request to the core stub with nino value <selectedNino>
        Examples:
            | selectedNino |
            | KE000000C    |
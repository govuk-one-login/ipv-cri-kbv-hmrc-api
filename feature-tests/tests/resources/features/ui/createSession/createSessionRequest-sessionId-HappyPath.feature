Feature: CORE-STUB-CreateSessionRequest-HappyPath.feature

    @post-merge
    Scenario Outline: Happy Path - Request for user claimSet from CoreStub for Valid User
        Given I start the journey with the backend stub and nino <selectedNino>
        Examples:
            | selectedNino |
            | KE000000C    |

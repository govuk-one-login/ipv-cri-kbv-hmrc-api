Feature: HMRC-KBV-GET-Question-HappyPath.feature

    @post-merge
    Scenario Outline: Happy Path - Get request to /question Endpoint for userId
        Given I start the journey with the backend stub and nino <selectedNino> for user <userId>
        When I select continue on the context page triggering fetch questions Request
        Then I see a question page
        Examples:
            | selectedNino | userId |
            | KE000000C    | 197    |

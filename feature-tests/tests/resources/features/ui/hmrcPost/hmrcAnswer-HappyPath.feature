Feature: HMRC-KBV-POST-Answer-HappyPath.feature

    @post-merge @regression
    Scenario Outline: Happy Path - Post request to /answer Endpoint for userId with >=3 questions over 2 questionKeys
        Given I start the journey with the backend stub and nino <selectedNino>
        When I select continue on the context page triggering fetch questions Request
        Then I see a question page
        And I complete 3 questions
        Then I should return to the stub
        And I should receive a VC with the correct values for a user with >=3 questions over 2 questionKey
        Examples:
            | selectedNino |
            | KE000000C    |
            | AA000000A    |
            | AA000003A    |
            | AA000004A    |
            | AA000005A    |
            | AA000006A    |
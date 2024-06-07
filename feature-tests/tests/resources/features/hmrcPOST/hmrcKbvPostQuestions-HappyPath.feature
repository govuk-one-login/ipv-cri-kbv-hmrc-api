Feature: HMRC-KBV-POST-Questions-HappyPath.feture

    Scenario Outline: Happy Path - Post Request to HMRC KBV Questions Endpoint
        Given I send a Valid POST request to the questions endpoint
        Then I should receive a response with <statusCode>
        Examples:
            | statusCode |
            | 202        |
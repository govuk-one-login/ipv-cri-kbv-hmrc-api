Feature: HMRC-KBV-POST-Answer-HappyPath.feature

    @pre-merge @regression
    Scenario Outline: Happy Path - Post request to /answer Endpoint for userId with >=3 questions over 2 questionKeys
        Given I send a new answer request to the core stub with nino value <selectedNino>
        Given I send a valid POST request with <contentType> and <accept> to the fetchQuestions endpoint with status code <statusCode>
        When I send a GET request to the question endpoint
        And I send a POST request to the answer endpoint with the correct answerKey
        And I send a second GET request to the question endpoint followed by a POST request to the answer endpoint
        And I send a third GET request to the question endpoint followed by a POST request to the answer endpoint
        Then I should receive a valid response with statusCode <statusCode> from the answers endpoint
        Then I should receive a final valid response with statusCode <finalStatusCode> from the questions endpoint
        And I should receive a VC with the correct values for a user with >=3 questions over 2 questionKey
        Examples:
            | contentType      | accept           | statusCode | finalStatusCode | selectedNino |
            | application/json | application/json | 200        | 204             | KE000000C    |
            | application/json | application/json | 200        | 204             | AA000000A    |
            | application/json | application/json | 200        | 204             | AA000003A    |
            | application/json | application/json | 200        | 204             | AA000004A    |
            | application/json | application/json | 200        | 204             | AA000005A    |
            | application/json | application/json | 200        | 204             | AA000006A    |

    @pre-merge
    Scenario Outline: Happy Path - Post request to /answer Endpoint for userId with 2 questions over 2 questionKeys
        Given I send a new request to the core stub with nino value <selectedNino> for a user with 2 questions
        Given I send a valid 2 question POST request with <contentType> and <accept> to the fetchQuestions endpoint with status code <statusCode>
        When I send the first GET request to the question endpoint followed by a POST request to the answer endpoint
        And I send a second GET request to the question endpoint followed by a final POST request to the answer endpoint
        Then I should receive the final valid response with statusCode <finalStatusCode> from the questions endpoint for a user with 2 questions answered correctly
        And I should receive a VC with the correct values for a user with 2 questions over 2 question keys
        Examples:
            | contentType      | accept           | statusCode | finalStatusCode | selectedNino |
            | application/json | application/json | 200        | 204             | AA000002C    |

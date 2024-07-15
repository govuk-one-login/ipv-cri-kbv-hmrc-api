Feature: HMRC-KBV-POST-Answer-HappyPath.feature 

    @regression @test
    Scenario Outline: Happy Path - Post request to /answer Endpoint for userId
        Given I send a POST request with <contentType> and <accept> to the fetchQuestions endpoint
        When I send a GET request to the question endpoint followed by a POST request to the answer endpoint
        And I send a second GET request to the question endpoint followed by a POST request to the answer endpoint
        And I send a third GET request to the question endpoint followed by a POST request to the answer endpoint
        Then I should receive a valid response with statusCode <statusCode> from the answers endpoint
        Then I should receive a final valid response with statusCode <finalStatusCode> from the questions endpoint
        Examples:
            | contentType      | accept           | statusCode | finalStatusCode |
            | application/json | application/json | 200        | 200             |

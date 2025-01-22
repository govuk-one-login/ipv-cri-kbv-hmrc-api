Feature: HMRC-KBV-GET-FetchQuestions-HappyPath.feature

    # @pre-merge @hmrc-fetchquestions
    Scenario Outline: Happy Path - Post Request to /fetchquestions Endpoint for userId with Nino <selectedNino>
        Given I send a new fetchquestions request to the core stub with nino value <selectedNino> for user <userId>
        When I send a POST request with <contentType> and <accept> to the fetchQuestions endpoint
        Then I should receive a valid response and statusCode <statusCode> from the fetchquestions endpoint
        Examples:
            | contentType      | accept           | statusCode | selectedNino | userId |
            | application/json | application/json | 200        | KE000000C    | 197    |

    # @pre-merge @hmrc-fetchquestions
    Scenario Outline: Happy Path - Post Request to /fetchquestions Endpoint for same userId with Nino <selectedNino
        Given I send a fetchquestions request to the core stub with nino value <selectedNino> for user <userId>
        When I send a POST request with <contentType> and <accept> to the fetchQuestions endpoint and receive a statusCode <statusCode>
        And I send another POST request with <contentType> and <accept> to the fetchQuestions endpoint for the same user <selectedNino>
        Then I should receive a valid response to state question already retreived and statusCode <finalStatusCode> from the fetchquestions endpoint
        Examples:
            | contentType      | accept           | statusCode | selectedNino | finalStatusCode | userId |
            | application/json | application/json | 200        | KE000000C    | 204             | 197    |

    # @pre-merge @hmrc-fetchquestions
    Scenario Outline: Happy Path - Post Request to /fetchquestions Endpoint for userId with Nino <selectedNino> with only low confidence questionKey
        Given I send a new fetchquestions request to the core stub with nino value <selectedNino> for user <userId>
        When I send a POST request with <contentType> and <accept> to the fetchQuestions endpoint
        Then I should receive a valid response and statusCode <statusCode> from the fetchquestions endpoint
        Examples:
            | contentType      | accept           | statusCode | selectedNino | userId |
            | application/json | application/json | 400        | AA000011L    | 197    |

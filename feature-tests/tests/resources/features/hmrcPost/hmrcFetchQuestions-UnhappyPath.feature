Feature: HMRC-KBV-GET-FetchQuestions-UnhappyPath.feature

    @pre-merge @hmrc-fetchquestions
    Scenario Outline: Unhappy Path - Post Request to /fetchquestions Endpoint - Invalid Header Values - sessionId
        Given I send a valid fetchquestions request to the core stub with nino value <selectedNino> for user <userId>
        When I send a POST request with <contentType> and <accept> to the fetchQuestions endpoint with a invalid sessionId <session_id>
        Then I should receive the appropriate response and statusCode <statusCode> from the fetchquestions endpoint when using invalid sessionId
        Examples:
            | contentType      | accept           | statusCode | selectedNino | session_id                           | userId |
            | application/json | application/json | 403        | KE000000C    | 44443939-4cf4-41e9-9fee-231e16e9f382 | 197    |

    @failing-regression @hmrc-fetchquestions
    # Confirm with Dev the expected outcome for invalid contentType headers
    Scenario Outline: Unhappy Path - Post Request to /fetchquestions Endpoint - Invalid Header Values - contentType and accept
        Given I send a new valid fetchquestions request to the core stub with nino value <selectedNino> for user <userId>
        When I send a POST request with invalid headers <contentType> and <accept> to the fetchQuestions endpoint
        Then I should receive the appropriate response and statusCode <statusCode> from the fetchquestions endpoint when using invalid headers
        Examples:
            | contentType      | accept           | statusCode | selectedNino | userId |
            | text/html        | application/json | 400        | KE000000C    | 197    |
            | application/json | text/html        | 403        | KE000000C    | 197    |

    @failing-regression @hmrc-fetchquestions
    Scenario Outline: Unhappy Path - Post Request to /fetchquestions Endpoint - Invalid Endpoint
        Given I send a new valid fetchquestions request to the core stub with the selected nino value <selectedNino> for user <userId>
        When I send a POST request with valid headers <contentType> and <accept> to a Invalid fetchQuestions endpoint
        Then I should receive the appropriate response and statusCode <statusCode> from the fetchquestions endpoint when using invalid endpoint
        Examples:
            | contentType      | accept           | statusCode | selectedNino | userId |
            | application/json | application/json | 403        | KE000000C    | 197    |

    @pre-merge @hmrc-fetchquestions
    Scenario Outline: Unhappy Path - Post Request to /fetchquestions Endpoint - Invalid Nino <selectedNino>
        Given I send a new fetchquestions request to the core stub with Invalid nino value <selectedNino> for user <userId>
        When I send a POST request with <contentType> and <accept> to the fetchQuestions endpoint with the invalid Nino
        Then I should receive a valid response and statusCode <statusCode> from the fetchquestions endpoint for the invalid Nino
        Examples:
            | contentType      | accept           | statusCode | selectedNino | userId |
            | application/json | application/json | 400        | XX000000A    | 197    |
            | application/json | application/json | 400        | KE000 000C   | 197    |

    @pre-merge @hmrc-fetchquestions
    Scenario Outline: Unhappy Path - Post Request to /fetchquestions Endpoint - Single Category Nino <selectedNino>
        Given I send a new fetchquestions request to the core stub with a nino value <selectedNino> for user <userId>
        When I send a POST request with <contentType> and <accept> to the fetchQuestions endpoint with the selected Nino
        Then I should receive a valid response and statusCode <statusCode> from the fetchquestions endpoint for a Nino with only 1 question Category
        Examples:
            | contentType      | accept           | statusCode | selectedNino | userId |
            | application/json | application/json | 400        | CC000001C    | 197    |

    @pre-merge @hmrc-fetchquestions
    Scenario Outline: Unhappy Path - Post Request to /fetchquestions Endpoint - No Questions Nino <selectedNino>
        Given I send a new fetchquestions request to the core stub with a no questions nino value <selectedNino> for user <userId>
        When I send a POST request with <contentType> and <accept> to fetchQuestions endpoint with the selected Nino
        Then I should receive a valid response and statusCode <statusCode> from the fetchquestions endpoint for a Nino with no questions
        Examples:
            | contentType      | accept           | statusCode | selectedNino | userId |
            | application/json | application/json | 400        | QQ000000Q    | 197    |

    @pre-merge @hmrc-fetchquestions
    Scenario Outline: Unhappy Path - Post Request to /fetchquestions Endpoint - Low Confidence Question Nino <selectedNino>
        Given I send a new fetchquestions request to the core stub with a low confidence nino value <selectedNino> for user <userId>
        When I send a POST request with <contentType> and <accept> to fetchQuestions endpoint with a Nino containing a low confidence question
        Then I should receive a valid response and statusCode <statusCode> from the fetchquestions endpoint for a Nino a low confidence question
        Examples:
            | contentType      | accept           | statusCode | selectedNino | userId |
            | application/json | application/json | 400        | AA000021L    | 197    |

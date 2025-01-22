Feature: HMRC-KBV-POST-Answer-UnhappyPath.feature

    # @pre-merge @hmrc-answer
    Scenario Outline: Unhappy Path - Post request to /answer Endpoint - Invalid Header Values - sessionId
        Given I send a request to the core stub with nino value <selectedNino> for user <userId>
        Given I send a valid POST request with <contentType> and <accept> to the fetchQuestions endpoint
        When I send a valid GET request to the question endpoint
        And I send a POST request to the question endpoint with a invalid sessionId <session_id>
        Then I should receive the appropriate response for the invalid header value with statusCode <statusCode>
        Examples:
            | contentType      | accept           | statusCode | selectedNino | session_id                           | userId |
            | application/json | application/json | 403        | AA000002A    | 44443939-4cf4-41e9-9fee-231e16e9f382 | 197    |

    # @failing-regression @hmrc-answer
    # Confirm with Dev the expected outcome for invalid contentType headers
    Scenario Outline: Unhappy Path - Post request to /answer Endpoint - Invalid Header Values - contentType and accept
        Given I send a valid request to the core stub with nino value <selectedNino> for user <userId>
        And I send a valid POST request to the fetchQuestions endpoint
        And I send a new valid GET request to the question endpoint
        When I send a POST request to the answer endpoint with invalid <contentType> and <accept>
        Then I should receive the appropriate response for the invalid headers value with statusCode <statusCode> and <responseMessage>
        Examples:
            | contentType | accept           | statusCode | selectedNino | responseMessage        | userId |
            | text/html   | application/json | 415        | KE000000C    | Unsupported Media Type | 197    |

    # @pre-merge @hmrc-answer
    Scenario Outline: Unhappy Path - Post request to /answer Endpoint - Invalid Endpoint
        Given I send a valid request to the core stub with the selected nino value <selectedNino> for user <userId>
        And I send a valid new POST request to the fetchQuestions endpoint
        And I send a valid new GET request to the question endpoint
        When I send a POST request to a Invalid answer endpoint with valid <contentType> and <accept>
        Then I should receive the appropriate response for the invalid answer endpoint with statusCode <statusCode> and <responseMessage>
        Examples:
            | contentType | accept           | statusCode | selectedNino | responseMessage              | userId |
            | text/html   | application/json | 403        | AA000002A    | Missing Authentication Token | 197    |

    # @pre-merge @hmrc-answer
    Scenario Outline: Unhappy Path - Post request to /answer Endpoint - Invalid Answer Body - Invalid Question Key
        Given I send a request to the core stub with a nino value <selectedNino> for user <userId>
        Given I send a new valid POST request to the fetchQuestions endpoint
        When I send a valid GET request to the question endpoint for a valid userId
        And I send a POST request to the question endpoint with a invalid questionKey body
        Then I should receive the appropriate response for the invalid post body with statusCode <statusCode>
        Examples:
            | statusCode | selectedNino | userId |
            | 500        | AA000002A    | 197    |

    # @pre-merge @hmrc-answer
    Scenario Outline: Unhappy Path - Post request to /answer Endpoint - Invalid Answer Body - Incorrect Question Key
        Given I send a new request to the core stub with a nino value <selectedNino> for user <userId>
        Given I send a new POST request to the fetchQuestions endpoint
        When I send a new valid GET request to the question endpoint for a valid userId
        And I send a POST request to the question endpoint with a incorrect questionKey body
        Then I should receive the appropriate response for the incorrect post body with statusCode <statusCode>
        Examples:
            | statusCode | selectedNino | userId |
            | 204        | AA000002A    | 197    |

    # @pre-merge @hmrc-answer
    Scenario Outline: Unhappy Path - Post request to /answer Endpoint - Invalid Answer Body - Incorrect Question Key Value
        Given I send a new valid request to the core stub with a nino value <selectedNino> for user <userId>
        Given I send a new POST request to the fetchQuestions endpoint for a valid userId
        When I send a new GET request to the question endpoint for a valid userId
        And I send a POST request to the question endpoint with a invalid questionKey <invalidQuestionKeyValue> value body
        Then I should receive the appropriate response for the invalid value post body with statusCode <statusCode>
        Examples:
            | statusCode | selectedNino | invalidQuestionKeyValue                                                                             | userId |
            | 500        | AL000000S    | {"questionKey": "tc-amount","value": "400"}                                                         | 197    |
            | 500        | AL000000S    | {"questionKey": "ita-bankaccount","value": "1234"}                                                  | 197    |
            | 500        | AL000000S    | {"questionKey": "sa-income-from-pensions","value": "400.00"}                                        | 197    |
            | 500        | AL000000S    | {"questionKey": "rti-p60-earnings-above-pt","value": "400.00"}                                      | 197    |
            | 500        | AL000000S    | {"questionKey": "rti-p60-postgraduate-loan-deductions","value": "400.00"}                           | 197    |
            | 500        | AL000000S    | {"questionKey": "rti-p60-student-loan-deductions","value": "400.00"}                                | 197    |
            | 500        | AL000000S    | {"questionKey": "sa-payment-details","value": "\"amount\": 300.00,\"paymentDate\": \"2010-01-01\""} | 197    |
            | 400        | AL000000S    |                                                                                                     | 197    |
            | 400        | AL000000S    | {"questionKey": "","": ""}                                                                          | 197    |
            | 400        | AL000000S    | {"": "","": ""}                                                                                     | 197    |
            | 400        | AL000000S    | {"questionKeys": "tc-amount","value": "400"}                                                        | 197    |

    # @pre-merge @hmrc-answer
    Scenario Outline: Unhappy Path - Post request to /answer Endpoint - Invalid Header Values - Malformed Response
        Given I send a answer request to the core stub with nino value <selectedNino> for user <userId>
        Given I send a new valid POST request with <contentType> and <accept> to the fetchQuestions endpoint with status code <statusCode>
        When I send the first GET request to the question endpoint followed by a POST request to the answer endpoint with the correct answerKey
        And I send the second GET request to the question endpoint followed by a POST request to the answer endpoint
        And I send the third GET request to the question endpoint followed by a POST request to the answer endpoint
        Then I should receive the valid response with statusCode <intermediateStatusCode> from the answers endpoint
        Examples:
            | contentType      | accept           | statusCode | intermediateStatusCode | finalStatusCode | selectedNino | userId |
            | application/json | application/json | 200        | 500                    | 204             | JS000002J    | 197    |

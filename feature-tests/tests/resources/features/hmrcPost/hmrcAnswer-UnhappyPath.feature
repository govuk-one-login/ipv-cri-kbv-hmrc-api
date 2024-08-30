Feature: HMRC-KBV-POST-Answer-UnhappyPath.feature

    @pre-merge @hmrc-answer
    Scenario Outline: Unhappy Path - Post request to /answer Endpoint - Invalid Header Values - sessionId
        Given I send a request to the core stub with nino value <selectedNino>
        Given I send a valid POST request with <contentType> and <accept> to the fetchQuestions endpoint
        When I send a valid GET request to the question endpoint
        And I send a POST request to the question endpoint with a invalid sessionId <session_id>
        Then I should receive the appropriate response for the invalid header value with statusCode <statusCode>
        Examples:
            | contentType      | accept           | statusCode | selectedNino | session_id                           |
            | application/json | application/json | 403        | AA000002A    | 44443939-4cf4-41e9-9fee-231e16e9f382 |

    @failing-regression @hmrc-answer
    # Confirm with Dev the expected outcome for invalid contentType headers
    Scenario Outline: Unhappy Path - Post request to /answer Endpoint - Invalid Header Values - contentType and accept
        Given I send a valid request to the core stub with nino value <selectedNino>
        And I send a valid POST request to the fetchQuestions endpoint
        And I send a new valid GET request to the question endpoint
        When I send a POST request to the answer endpoint with invalid <contentType> and <accept>
        Then I should receive the appropriate response for the invalid headers value with statusCode <statusCode> and <responseMessage>
        Examples:
            | contentType | accept           | statusCode | selectedNino | responseMessage        |
            | text/html   | application/json | 415        | KE000000C    | Unsupported Media Type |

    @pre-merge @hmrc-answer
    Scenario Outline: Unhappy Path - Post request to /answer Endpoint - Invalid Endpoint
        Given I send a valid request to the core stub with the selected nino value <selectedNino>
        And I send a valid new POST request to the fetchQuestions endpoint
        And I send a valid new GET request to the question endpoint
        When I send a POST request to a Invalid answer endpoint with valid <contentType> and <accept>
        Then I should receive the appropriate response for the invalid answer endpoint with statusCode <statusCode> and <responseMessage>
        Examples:
            | contentType | accept           | statusCode | selectedNino | responseMessage              |
            | text/html   | application/json | 403        | AA000002A    | Missing Authentication Token |

    @pre-merge @hmrc-answer
    Scenario Outline: Unhappy Path - Post request to /answer Endpoint - Invalid Answer Body - Invalid Question Key
        Given I send a request to the core stub with a nino value <selectedNino>
        Given I send a new valid POST request to the fetchQuestions endpoint
        When I send a valid GET request to the question endpoint for a valid userId
        And I send a POST request to the question endpoint with a invalid questionKey body
        Then I should receive the appropriate response for the invalid post body with statusCode <statusCode>
        Examples:
            | statusCode | selectedNino |
            | 500        | AA000002A    |

    @pre-merge @hmrc-answer
    Scenario Outline: Unhappy Path - Post request to /answer Endpoint - Invalid Answer Body - Incorrect Question Key
        Given I send a new request to the core stub with a nino value <selectedNino>
        Given I send a new POST request to the fetchQuestions endpoint
        When I send a new valid GET request to the question endpoint for a valid userId
        And I send a POST request to the question endpoint with a incorrect questionKey body
        Then I should receive the appropriate response for the incorrect post body with statusCode <statusCode>
        Examples:
            | statusCode | selectedNino |
            | 204        | AA000002A    |

    @pre-merge @hmrc-answer
    Scenario Outline: Unhappy Path - Post request to /answer Endpoint - Invalid Answer Body - Incorrect Question Key Value
        Given I send a new valid request to the core stub with a nino value <selectedNino>
        Given I send a new POST request to the fetchQuestions endpoint for a valid userId
        When I send a new GET request to the question endpoint for a valid userId
        And I send a POST request to the question endpoint with a invalid questionKey <invalidQuestionKeyValue> value body
        Then I should receive the appropriate response for the invalid value post body with statusCode <statusCode>
        Examples:
            | statusCode | selectedNino | invalidQuestionKeyValue                                                                             |
            | 500        | AL000000S    | {"questionKey": "tc-amount","value": "400"}                                                         |
            | 500        | AL000000S    | {"questionKey": "ita-bankaccount","value": "1234"}                                                  |
            | 500        | AL000000S    | {"questionKey": "sa-income-from-pensions","value": "400.00"}                                        |
            | 500        | AL000000S    | {"questionKey": "rti-p60-earnings-above-pt","value": "400.00"}                                      |
            | 500        | AL000000S    | {"questionKey": "rti-p60-postgraduate-loan-deductions","value": "400.00"}                           |
            | 500        | AL000000S    | {"questionKey": "rti-p60-student-loan-deductions","value": "400.00"}                                |
            | 500        | AL000000S    | {"questionKey": "sa-payment-details","value": "\"amount\": 300.00,\"paymentDate\": \"2010-01-01\""} |
            | 400        | AL000000S    |                                                                                                     |
            | 400        | AL000000S    | {"questionKey": "","": ""}                                                                          |
            | 400        | AL000000S    | {"": "","": ""}                                                                                     |
            | 400        | AL000000S    | {"questionKeys": "tc-amount","value": "400"}                                                        |

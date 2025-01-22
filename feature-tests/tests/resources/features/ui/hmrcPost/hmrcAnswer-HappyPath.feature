Feature: HMRC-KBV-POST-Answer-HappyPath.feature

    # @post-merge
    Scenario Outline: Happy Path - Post request to /answer Endpoint for userId with >=3 questions over 2 questionKeys
        Given I start the journey with the backend stub and nino <selectedNino> for user <userId>
        When I select continue on the context page triggering fetch questions Request
        Then I see a question page
        And I complete 3 questions
        Then I should return to the stub
        And I should receive a VC with the correct verificationScore <verificationScore> for a user with >=3 questions over 2 questionKey
        Examples:
            | selectedNino | verificationScore       | userId |
            | KE000000C    | "verificationScore": 2, | 197    |
            # | AA000000A    | "verificationScore": 2, | 197    |
            # | AA000003A    | "verificationScore": 2, | 197    |
            # | AA000004A    | "verificationScore": 2, | 197    |
            # | AA000005A    | "verificationScore": 2, | 197    |
            # | AA000006A    | "verificationScore": 2, | 197    |
            # | AA000003C    | "verificationScore": 0, | 197    |
            # | AA000003Z    | "verificationScore": 0, | 197    |

    # @post-merge
    Scenario Outline: Happy Path - Post request to /answer Endpoint for userId with 2 questions over 2 questionKeys
        Given I start the journey with the backend stub and nino <selectedNino> for user <userId>
        When I select continue on the context page triggering fetch questions Request
        Then I see a question page
        And I complete 2 questions
        Then I should return to the stub
        And I should receive a VC with the correct verificationScore <verificationScore> for a user with 2 questions over 2 questionKey
        Examples:
            | selectedNino | verificationScore       | userId |
            | AA000002A    | "verificationScore": 2, | 197    |
            | AA000002Z    | "verificationScore": 0, | 197    |
            | AA000002C    | "verificationScore": 0, | 197    |

    # @uat
    Scenario Outline: Happy Path - Post request to /answer Endpoint for HMRC userId with >=3 questions over 2 questionKeys with verificationScore of 2
        Given I start the journey with the backend stub for nino <selectedNino> for user <userId> with FirstName <firstName> and FamilyName <familyName>
        When I select continue on the context page calling fetch questions Request
        Then I see the first question page
        And I complete 3 questions correctly for the UAT user
        Then I should return to the core stub
        And I should receive a VC with the correct verificationScore <verificationScore> for a HMRC user with >=3 questions over 2 questionKey
        Examples:
            | selectedNino | verificationScore       | userId | firstName | familyName  |
            | AA000003D    | "verificationScore": 2, | 197    | KENNETH   | DECERQUEIRA |
            # | AB000001A    | "verificationScore": 2, | 197    | HARRY     | LIGHT       |

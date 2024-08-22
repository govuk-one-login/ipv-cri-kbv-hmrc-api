import { defineFeature, loadFeature } from "jest-cucumber";

import { Builder, By, WebDriver } from "selenium-webdriver";
import { findObjectContainingValue } from "../../../../utils/utility";
import { questionKeyResponse } from "../../../../utils/answer_body";
import { urlKeyMap } from "../../../../utils/url-key-map";
import {
  generateClaimsUrl,
  postUpdatedClaimsUrl,
} from "../../../../utils/create-session";
import { ContextPage } from "../../page/context-page";
import { QuestionPage } from "../../page/question-page";

import EndPoints from "../../../../apiEndpoints/endpoints";
import { StubPage } from "../../page/stub-page";
import { Options } from "selenium-webdriver/chrome";

const feature = loadFeature(
  "./tests/resources/features/ui/hmrcPost/hmrcAnswer-HappyPath.feature"
);

defineFeature(feature, (test) => {
  let driver: WebDriver;

  let chromeOptions = new Options();
  if (process.env.CI) {
    chromeOptions.addArguments("--no-sandbox");
    chromeOptions.addArguments("--whitelisted-ips= ");
    chromeOptions.addArguments("--disable-dev-shm-usage");
    // chromeOptions.addArguments("--remote-debugging-port=9222");

    chromeOptions.addArguments("start-maximized");
    chromeOptions.addArguments("disable-infobars");
    chromeOptions.addArguments("--disable-extensions");

    chromeOptions.addArguments("--remote-allow-origins=*");
    chromeOptions.addArguments("--headless=new");
  }

  driver = new Builder()
    .forBrowser("chrome")
    .setChromeOptions(chromeOptions)
    .build();

  beforeEach(async () => {});

  afterAll(async () => {
    driver.close();
  });

  test("Happy Path - Post request to /answer Endpoint for userId with >=3 questions over 2 questionKeys", ({
    given,
    then,
    when,
    and,
  }) => {
    given(
      /^I start the journey with the backend stub and nino (.*)$/,
      async (selectedNino) => {
        await generateClaimsUrl(selectedNino);
        let encodedClaims = await postUpdatedClaimsUrl();
        let contextPage: ContextPage = new ContextPage(driver);
        await contextPage.goTo(
          EndPoints.FRONTEND +
            "/oauth2/authorize?request=" +
            encodedClaims.request +
            "&client_id=" +
            encodedClaims.client_id
        );
      }
    );

    when(
      /^I select continue on the context page triggering fetch questions Request$/,
      async () => {
        let contextPage: ContextPage = new ContextPage(driver);
        expect(contextPage).toBeTruthy();
        await contextPage.clickContinue();
      }
    );

    then(/^I see a question page$/, async () => {
      let pageTitle = await driver.getTitle();
      let isQuestionPage =
        pageTitle.includes("Enter the") ||
        pageTitle.includes("What type") ||
        pageTitle.includes("Enter a");
      expect(isQuestionPage).toBeTruthy();
    });

    and(/^I complete 3 questions$/, async () => {
      await enterAnswer();
      await clickContinue();

      await enterAnswer();
      await clickContinue();

      await enterAnswer();
      await clickContinue();
    });

    then(/^I should return to the stub$/, async () => {
      expect(await driver.getCurrentUrl()).toContain(EndPoints.CORE_STUB_URL);
    });

    and(
      /^I should receive a VC with the correct values for a user with >=3 questions over 2 questionKey$/,
      async () => {
        let stubPage: StubPage = new StubPage(driver);

        let summaryElement = await driver.findElements(
          By.xpath('//*[@id="main-content"]/div/details/summary')
        );
        if (summaryElement.length <= 0) {
          let currentUrl = await driver.getCurrentUrl();
          let urlWithoutPrefix = currentUrl.substring("https://".length);
          let authUrl =
            "https://" +
            EndPoints.CORE_STUB_USERNAME +
            ":" +
            EndPoints.CORE_STUB_PASSWORD +
            "@" +
            urlWithoutPrefix;
          driver.get(authUrl);
        }

        let vcText = await stubPage.getVc();
        expect(vcText).toContain('"verificationScore": 2');
      }
    );
  });

  async function enterAnswer() {
    let currentUrl = await driver.getCurrentUrl();
    let currentPath = currentUrl.substring(currentUrl.lastIndexOf("/") + 1);
    let questionFromUrl = await findObjectContainingValue(
      urlKeyMap,
      currentPath
    );

    const questionKeyProp = Object.keys(questionFromUrl!)[0];
    const questionKeyFromUrl = questionFromUrl![questionKeyProp];

    const postPayload = await findObjectContainingValue(
      questionKeyResponse,
      questionKeyFromUrl.questionKey
    );
    const objectProprty = Object.keys(postPayload!)[0];
    const postQuestionKey = postPayload![objectProprty];

    let quesionPage: QuestionPage = new QuestionPage(driver);

    if (postQuestionKey.questionKey === "sa-payment-details") {
      let saPaymentJson = JSON.parse(postQuestionKey.value);
      let dateArray = saPaymentJson.paymentDate.split("-");
      await quesionPage.enterAnswer(
        dateArray[2],
        "selfAssessmentPaymentDate-day"
      );
      await quesionPage.enterAnswer(
        dateArray[1],
        "selfAssessmentPaymentDate-month"
      );
      await quesionPage.enterAnswer(
        dateArray[0],
        "selfAssessmentPaymentDate-year"
      );
      await quesionPage.enterAnswer(
        saPaymentJson.amount.toFixed(2),
        "selfAssessmentPaymentAmount"
      );
    } else if (postQuestionKey.questionKey === "sa-income-from-pensions") {
      await quesionPage.selectRadio("selfAssessmentRouter-sa200");
      await driver
        .findElement(By.xpath('//*[@id="main-content"]/div/div/form/button'))
        .click();
      await quesionPage.enterAnswer(
        "" + (postQuestionKey.value / 5).toFixed(),
        "statePensionShort"
      );
      await quesionPage.enterAnswer(
        "" + (postQuestionKey.value / 5).toFixed(),
        "otherPensionShort"
      );
      await quesionPage.enterAnswer(
        "" + (postQuestionKey.value / 5).toFixed(),
        "employmentAndSupportAllowanceShort"
      );
      await quesionPage.enterAnswer(
        "" + (postQuestionKey.value / 5).toFixed(),
        "jobSeekersAllowanceShort"
      );
      await quesionPage.enterAnswer(
        "" + (postQuestionKey.value / 5).toFixed(),
        "statePensionAndBenefitsShort"
      );
    } else {
      await quesionPage.enterAnswer(
        postQuestionKey.value,
        postQuestionKey.questionKey
      );
    }
  }

  async function clickContinue() {
    let quesionPage: QuestionPage = new QuestionPage(driver);
    await quesionPage.clickContinue();
  }
});

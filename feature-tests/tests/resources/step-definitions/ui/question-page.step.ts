import { defineFeature, loadFeature } from "jest-cucumber";
import { Builder, By, WebDriver } from "selenium-webdriver";
import { findObjectContainingValue } from "../../../../utils/utility";
import { questionKeyResponse } from "../../../../utils/answer_body";
import { urlKeyMap } from "../../../../utils/url-key-map";
import { timeDelayForTestEnvironment } from "../../../../utils/utility";
import {
  generateClaimsUrl,
  postUpdatedClaimsUrl,
  updateClaimsUrl,
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

  beforeEach(async () => {
    console.log("STARTING NEW FRONT END HMRC KBV CRI JOURNEY");
  });

  afterAll(async () => {
    driver.close();
  });

  test("Happy Path - Post request to /answer Endpoint for userId with >=3 questions over 2 questionKeys - Verification Score 2", ({
    given,
    then,
    when,
    and,
  }) => {
    given(
      /^I start the journey with the backend core stub and nino (.*) for user (.*)$/,
      async (selectedNino, userId) => {
        await generateClaimsUrl(selectedNino, userId);
        let encodedClaims = await postUpdatedClaimsUrl(false);
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
      await driver.wait(
        async () => {
          let pageTitle = await driver.getTitle();
          return (
            pageTitle.includes("Enter the") ||
            pageTitle.includes("What type") ||
            pageTitle.includes("Enter a")
          );
        },
        1000,
        "Expected the page to be a question page, but it wasn't."
      );
      let pageTitle = await driver.getTitle();
      console.log(`Page Title: ${pageTitle}`);
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
      /^I should receive a VC with the correct verificationScore (.*) for a user with >=3 questions over 2 questionKey$/,
      async (verificationScore: string) => {
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
        expect(vcText).toContain(verificationScore);
        console.log("VC Data", vcText);
      }
    );
  });

  test("Happy Path - Post request to /answer Endpoint for userId with >=3 questions over 2 questionKeys - Verification Score 0", ({
    given,
    then,
    when,
    and,
  }) => {
    given(
      /^I start the journey with the backend core stub and nino (.*) for user (.*)$/,
      async (selectedNino, userId) => {
        await generateClaimsUrl(selectedNino, userId);
        let encodedClaims = await postUpdatedClaimsUrl(false);
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
      await driver.wait(
        async () => {
          let pageTitle = await driver.getTitle();
          return (
            pageTitle.includes("Enter the") ||
            pageTitle.includes("What type") ||
            pageTitle.includes("Enter a")
          );
        },
        1000,
        "Expected the page to be a question page, but it wasn't."
      );
      let pageTitle = await driver.getTitle();
      console.log(`Page Title: ${pageTitle}`);
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
      /^I should receive a VC with verificationScore (.*) for a user with >=3 questions over 2 questionKey$/,
      async (verificationScore: string) => {
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
        const vcData = JSON.parse(vcText);
        const extractedCiValue = vcData.vc.evidence[0].ci[0];
        const ciRegex = /^[a-zA-Z]\d{2}$/;
        expect(vcText).toContain(verificationScore);
        expect(ciRegex.test(extractedCiValue)).toBe(true);
        console.log("VC Data Returned: ", vcText);
      }
    );
  });

  test("Happy Path - Post request to /answer Endpoint for userId with 2 questions over 2 questionKeys - Verification Score 2", ({
    given,
    then,
    when,
    and,
  }) => {
    given(
      /^I start the journey with the backend stub and nino (.*) for user (.*)$/,
      async (selectedNino, userId) => {
        await generateClaimsUrl(selectedNino, userId);
        let encodedClaims = await postUpdatedClaimsUrl(false);
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
      await driver.wait(
        async () => {
          let pageTitle = await driver.getTitle();
          return (
            pageTitle.includes("Enter the") ||
            pageTitle.includes("What type") ||
            pageTitle.includes("Enter a")
          );
        },
        1000,
        "Expected the page to be a question page, but it wasn't."
      );
      let pageTitle = await driver.getTitle();
      console.log(`Page Title: ${pageTitle}`);
      let isQuestionPage =
        pageTitle.includes("Enter the") ||
        pageTitle.includes("What type") ||
        pageTitle.includes("Enter a");
      expect(isQuestionPage).toBeTruthy();
    });

    and(/^I complete 2 questions$/, async () => {
      await enterAnswer();
      await clickContinue();

      await enterAnswer();
      await clickContinue();
    });

    then(/^I should return to the stub$/, async () => {
      expect(await driver.getCurrentUrl()).toContain(EndPoints.CORE_STUB_URL);
    });

    and(
      /^I should receive a VC with the correct verificationScore (.*) for a user with 2 questions over 2 questionKey$/,
      async (verificationScore: string) => {
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
        expect(vcText).toContain(verificationScore);
      }
    );
  });

  test("Happy Path - Post request to /answer Endpoint for userId with 2 questions over 2 questionKeys - Verification Score 0", ({
    given,
    then,
    when,
    and,
  }) => {
    given(
      /^I start the journey with the backend stub and nino (.*) for user (.*)$/,
      async (selectedNino, userId) => {
        await generateClaimsUrl(selectedNino, userId);
        let encodedClaims = await postUpdatedClaimsUrl(false);
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
      await driver.wait(
        async () => {
          let pageTitle = await driver.getTitle();
          return (
            pageTitle.includes("Enter the") ||
            pageTitle.includes("What type") ||
            pageTitle.includes("Enter a")
          );
        },
        1000,
        "Expected the page to be a question page, but it wasn't."
      );
      let pageTitle = await driver.getTitle();
      console.log(`Page Title: ${pageTitle}`);
      let isQuestionPage =
        pageTitle.includes("Enter the") ||
        pageTitle.includes("What type") ||
        pageTitle.includes("Enter a");
      expect(isQuestionPage).toBeTruthy();
    });

    and(/^I complete 2 questions$/, async () => {
      await enterAnswer();
      await clickContinue();

      await enterAnswer();
      await clickContinue();
    });

    then(/^I should return to the stub$/, async () => {
      expect(await driver.getCurrentUrl()).toContain(EndPoints.CORE_STUB_URL);
    });

    and(
      /^I should receive a VC with verificationScore (.*) for a user with 2 questions over 2 questionKey$/,
      async (verificationScore: string) => {
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
        const vcData = JSON.parse(vcText);
        const extractedCiValue = vcData.vc.evidence[0].ci[0];
        const ciRegex = /^[a-zA-Z]\d{2}$/;
        expect(vcText).toContain(verificationScore);
        expect(ciRegex.test(extractedCiValue)).toBe(true);
        console.log("VC Data Returned: ", vcText);
      }
    );
  });

  test("Happy Path - Post request to /answer Endpoint for HMRC userId with >=3 questions over 2 questionKeys - Verification Score 2", ({
    given,
    then,
    when,
    and,
  }) => {
    given(
      /^I start the journey with the backend stub for nino (.*) for user (.*) with FirstName (.*) and FamilyName (.*)$/,
      async (selectedNino, userId, firstName, familyName) => {
        await generateClaimsUrl(selectedNino, userId);
        await updateClaimsUrl(firstName, familyName);
        let encodedClaims = await postUpdatedClaimsUrl(true);
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
      /^I select continue on the context page calling fetch questions Request$/,
      async () => {
        let contextPage: ContextPage = new ContextPage(driver);
        expect(contextPage).toBeTruthy();
        await contextPage.clickContinue();
      }
    );

    then(/^I see the first question page$/, async () => {
      await driver.wait(
        async () => {
          let pageTitle = await driver.getTitle();
          return (
            pageTitle.includes("Enter the") ||
            pageTitle.includes("What type") ||
            pageTitle.includes("Enter a")
          );
        },
        1000,
        "Expected the page to be a question page, but it wasn't."
      );
      let pageTitle = await driver.getTitle();
      console.log(`Page Title: ${pageTitle}`);
      let isQuestionPage =
        pageTitle.includes("Enter the") ||
        pageTitle.includes("What type") ||
        pageTitle.includes("Enter a");
      expect(isQuestionPage).toBeTruthy();
    });

    and(/^I complete 3 questions correctly for the UAT user$/, async () => {
      await enterAnswer();
      await clickContinue();

      await enterAnswer();
      await clickContinue();

      await enterAnswer();
      await clickContinue();
    });

    then(/^I should return to the core stub$/, async () => {
      expect(await driver.getCurrentUrl()).toContain(EndPoints.CORE_STUB_URL);
    });

    and(
      /^I should receive a VC with the correct verificationScore (.*) for a HMRC user with >=3 questions over 2 questionKey$/,
      async (verificationScore: string) => {
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
        expect(vcText).toContain(verificationScore);
        console.log("VC Data Returned: ", vcText);
      }
    );
  });

  test("Happy Path - Post request to /answer Endpoint for HMRC userId with >=3 questions over 2 questionKeys - Verification Score 0", ({
    given,
    then,
    when,
    and,
  }) => {
    given(
      /^I start the journey with the backend stub for nino (.*) for user (.*) with FirstName (.*) and FamilyName (.*)$/,
      async (selectedNino, userId, firstName, familyName) => {
        await generateClaimsUrl(selectedNino, userId);
        await updateClaimsUrl(firstName, familyName);
        let encodedClaims = await postUpdatedClaimsUrl(true);
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
      /^I select continue on the context page calling fetch questions Request$/,
      async () => {
        let contextPage: ContextPage = new ContextPage(driver);
        expect(contextPage).toBeTruthy();
        await contextPage.clickContinue();
      }
    );

    then(/^I see the first question page$/, async () => {
      let pageTitle = await driver.getTitle();
      let isQuestionPage =
        pageTitle.includes("Enter the") ||
        pageTitle.includes("What type") ||
        pageTitle.includes("Enter a");
      // expect(isQuestionPage).toBe(true);
    });

    and(/^I complete 3 questions correctly for the UAT user$/, async () => {
      await enterAnswer();
      await clickContinue();

      await enterAnswer();
      await clickContinue();

      await enterAnswer();
      await clickContinue();
    });

    then(/^I should return to the core stub$/, async () => {
      expect(await driver.getCurrentUrl()).toContain(EndPoints.CORE_STUB_URL);
    });

    and(
      /^I should receive a VC with the expected verificationScore (.*) score for a HMRC user with >=3 questions over 2 questionKey$/,
      async (verificationScore: string) => {
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
        const vcData = JSON.parse(vcText);
        const extractedCiValue = vcData.vc.evidence[0].ci[0];
        const ciRegex = /^[a-zA-Z]\d{2}$/;
        expect(vcText).toContain(verificationScore);
        expect(ciRegex.test(extractedCiValue)).toBe(true);
        console.log("VC Data Returned: ", vcText);
      }
    );
  });

  test("UnHappy Path - Post request to /answer Endpoint for userId whos Nino is not recognised", ({
    given,
    then,
  }) => {
    given(
      /^I start the journey with the backend stub and invalid nino (.*) for user (.*)$/,
      async (selectedNino, userId) => {
        await generateClaimsUrl(selectedNino, userId);
        let encodedClaims = await postUpdatedClaimsUrl(false);
        let contextPage: ContextPage = new ContextPage(driver);
        await timeDelayForTestEnvironment(2000);
        await contextPage.goTo(
          EndPoints.FRONTEND +
            "/oauth2/authorize?request=" +
            encodedClaims.request +
            "&client_id=" +
            encodedClaims.client_id
        );
      }
    );

    then(/^I see a (.*) page$/, async (errorPageUrl: string) => {
      let invalidRequestPage = await driver.getCurrentUrl();
      console.log(`Page URL: ${invalidRequestPage}`);
      expect(invalidRequestPage).toContain(errorPageUrl);
      await timeDelayForTestEnvironment(2000);
    });
  });

  async function enterAnswer() {
    let currentUrl = await driver.getCurrentUrl();
    let currentPath = currentUrl.substring(currentUrl.lastIndexOf("/") + 1);
    let questionFromUrl = await findObjectContainingValue(
      urlKeyMap,
      currentPath
    );

    const questionKeyFromUrl =
      questionFromUrl && questionFromUrl[Object.keys(questionFromUrl)[0]];
    if (!questionKeyFromUrl) {
      return; // Or handle the case where questionKeyFromUrl is not found
    }

    const postPayload = await findObjectContainingValue(
      questionKeyResponse,
      questionKeyFromUrl.questionKey
    );
    const postQuestionKey =
      postPayload && postPayload[Object.keys(postPayload)[0]];
    if (!postQuestionKey) {
      return; // Or handle the case where postQuestionKey is not found
    }

    const questionPage = new QuestionPage(driver);

    switch (postQuestionKey.questionKey) {
      case "sa-payment-details": {
        const saPaymentJson = JSON.parse(postQuestionKey.value);
        const [year, month, day] = saPaymentJson.paymentDate.split("-");
        await questionPage.enterAnswer(day, "selfAssessmentPaymentDate-day");
        await questionPage.enterAnswer(
          month,
          "selfAssessmentPaymentDate-month"
        );
        await questionPage.enterAnswer(year, "selfAssessmentPaymentDate-year");
        await questionPage.enterAnswer(
          saPaymentJson.amount.toFixed(2),
          "selfAssessmentPaymentAmount"
        );
        break;
      }
      case "sa-income-from-pensions": {
        await questionPage.selectRadio("selfAssessmentRouter-sa200");
        await driver
          .findElement(By.xpath('//*[@id="main-content"]/div/div/form/button'))
          .click();
        const pensionValue = (postQuestionKey.value / 5).toFixed();
        await questionPage.enterAnswer(pensionValue, "statePensionShort");
        await questionPage.enterAnswer(pensionValue, "otherPensionShort");
        await questionPage.enterAnswer(
          pensionValue,
          "employmentAndSupportAllowanceShort"
        );
        await questionPage.enterAnswer(
          pensionValue,
          "jobSeekersAllowanceShort"
        );
        await questionPage.enterAnswer(
          pensionValue,
          "statePensionAndBenefitsShort"
        );
        break;
      }
      default:
        await questionPage.enterAnswer(
          postQuestionKey.value,
          postQuestionKey.questionKey
        );
    }
  }

  async function clickContinue() {
    let questionPage: QuestionPage = new QuestionPage(driver);
    await questionPage.clickContinue();
  }
});

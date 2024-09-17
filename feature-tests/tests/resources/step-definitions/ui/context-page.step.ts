import { defineFeature, loadFeature } from "jest-cucumber";
import EndPoints from "../../../../apiEndpoints/endpoints";
import {
  generateClaimsUrl,
  postUpdatedClaimsUrl,
} from "../../../../utils/create-session";
import { ContextPage } from "../../page/context-page";
import { Builder, WebDriver } from "selenium-webdriver";
import { Options } from "selenium-webdriver/chrome";

const feature = loadFeature(
  "./tests/resources/features/ui/hmrcGet/hmrcQuestion-HappyPath.feature"
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
    await driver.quit();
  });

  test("Happy Path - Get request to /question Endpoint for userId", ({
    given,
    then,
    when,
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
  });
});

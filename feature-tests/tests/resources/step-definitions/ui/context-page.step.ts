import { defineFeature, loadFeature } from "jest-cucumber";
import EndPoints from "../../../../apiEndpoints/endpoints";
import {
  generateClaimsUrl,
  postUpdatedClaimsUrl,
} from "../../../../utils/create-session";
import { ContextPage } from "../../page/context-page";
import { Builder, Capabilities, WebDriver } from "selenium-webdriver";
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
  });

  test("Happy Path - Get request to /question Endpoint for userId", ({
    given,
    then,
    when,
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

    given(
      /^I select continue on the context page triggering fetch questions Request$/,
      async () => {
        let contextPage: ContextPage = new ContextPage(driver);
        await contextPage.clickContinue();
      }
    );

    given(/^I see a question page$/, async () => {
      let pageTitle = await driver.getTitle();
      let isQuestionPage =
        pageTitle.includes("Enter the") ||
        pageTitle.includes("What type") ||
        pageTitle.includes("Enter a");
      expect(isQuestionPage).toBeTruthy();
    });
  });
});

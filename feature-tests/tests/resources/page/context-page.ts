import { WebDriver, By, until } from "selenium-webdriver";
import { AbstractPageObject } from "./abstract-page-object";
import { timeDelayForTestEnvironment } from "../../../utils/utility";

export class ContextPage extends AbstractPageObject {
  private continueButton = By.xpath("//*[@id='start']");

  constructor(driver: WebDriver) {
    super(driver);
  }

  clickContinue = async () => {
    await this.driver.wait(until.elementLocated(this.continueButton));
    await this.driver.findElement(this.continueButton).click();
    return this;
  };

  goTo = async (pageUrl: string) => {
    console.log(`Navigating to: ${pageUrl}`);
    await this.driver.get(pageUrl);
  };
}

import { WebDriver, By, until } from "selenium-webdriver";
import { AbstractPageObject } from "./abstract-page-object";

export class ContextPage extends AbstractPageObject {
  private continueButton = By.xpath("//*[@id='start']");

  constructor(driver: WebDriver) {
    super(driver);
  }

  clickContinue = async () => {
    await this.driver.wait(until.elementLocated(this.continueButton)), 2000;
    await this.driver.findElement(this.continueButton).click();
    return this;
  };

  goTo = async (pageUrl: string) => {
    await this.driver.get(pageUrl);
  };
}

import { WebDriver, By } from 'selenium-webdriver';
import { AbstractPageObject } from './abstract-page-object';

export class StubPage extends AbstractPageObject {

    private vcBlock = By.id('data');

    constructor(driver: WebDriver) {
        super(driver);
    }

    getVc = async (): Promise<string> => {
        await this.driver.findElement(By.xpath("//*[@id=\"main-content\"]/div/details/summary")).click();
        let vcText = await this.driver.findElement(this.vcBlock).getText();
        return vcText;
    };
}
import { WebDriver, By } from 'selenium-webdriver';
import { AbstractPageObject } from './abstract-page-object';

export class QuestionPage extends AbstractPageObject {

    private continueButton = By.id('continue');

    constructor(driver: WebDriver) {
        super(driver);
    }

    clickContinue = async () => {
        await this.driver.findElement(this.continueButton).click();
        return this;
    };

    enterAnswer = async (answer: string, questionKey: string) => {
        await this.driver.findElement(By.id(questionKey)).sendKeys(answer);
        return this;
    };

    selectRadio = async (id: string) => {
        await this.driver.findElement(By.id(id)).click();
        return this;
    };
    
}
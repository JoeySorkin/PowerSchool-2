import { Browser, Page } from 'puppeteer';
const Client = require('./Client');
const puppeteer = require('puppeteer');
const SECRETS = require('../secrets.js');
const advanceStated = (newState: String) => {
	console.log(`PS2API STATUS: ${newState}...`);
};

const scrape = async () => {
	//Launch Browser and visit site
	const browser: Browser = await puppeteer.launch({ headless: false });
	const page: Page = await browser.newPage();
	await page.setViewport({ width: 1200, height: 720 });
	await page.goto('https://ps2.millburn.org/public/home.html', {
		waitUntil: 'networkidle0',
	});
	advanceStated('Launched Page');

	await page.type('#fieldAccount', SECRETS.username);
	await page.type('#fieldPassword', SECRETS.password);

	await page.keyboard.press('Enter');

	await page.waitForNavigation();
	//Login Error Catching
	await page.$eval('.feedback-alert', (item) => {
		if (item != null) {
			if ((item.innerHTML = 'Invalid Username or Password!')) {
				throw 'Invalid Login Credentials';
			}
		}
	});
	advanceStated('Logged In');
	const data = await page.$$eval('#students-list > li > a', (item) => {
		return item.map((e) => e.innerHTML);
	});
	return data;
};
const play = async () => {
	const client = new Client({
		username: SECRETS.username,
		password: SECRETS.password,
	});
	// await client.login();
	// console.log(client.students);
	// console.log(client.studentsIds[client.students.indexOf('Joseph')]);
	await client.fetchGrades('Joseph');
};
play();

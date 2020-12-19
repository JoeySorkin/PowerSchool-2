import { Browser, Page } from 'puppeteer';
const puppeteer = require('puppeteer');
const SECRETS = require('../secrets.js');
const HTMLParser = require('node-html-parser');
const { parse } = HTMLParser;
var fs = require('fs');
interface Credentials {
	username: string;
	password: string;
}
module.exports = class Client {
	creds: Credentials;
	browser: Browser;
	page: Page;
	grades: Array<String>[];
	user: string;
	students: String[] | null;
	studentsIds: String[] | null;
	constructor(creds: Credentials) {
		this.creds = creds;
		this.students = null;
		this.studentsIds = null;
	}
	/**
	 * Logs in, stores the available users under the accoutn or throws an error due to invalid credentials
	 */
	async login() {
		this.browser = await puppeteer.launch({ headless: false });
		this.page = await this.browser.newPage();
		await this.page.setViewport({ width: 1200, height: 720 });
		await this.page.goto('https://ps2.millburn.org/public/home.html', {
			waitUntil: 'networkidle0',
		});
		await this.page.type('#fieldAccount', this.creds.username);
		await this.page.type('#fieldPassword', this.creds.password);
		await this.page.keyboard.press('Enter');
		await this.page.waitForNavigation();
		//Login Error Catching
		try {
			await this.page.$eval('.feedback-alert', (item) => {
				if (item != null) {
					if ((item.innerHTML = 'Invalid Username or Password!')) {
						throw 'Invalid Login Credentials';
					}
				}
			});
		} catch {}
		//Is completely dismissing errors okay?
		interface Data {
			ref: String;
			student: String;
		}
		const data: Data[] = await this.page.$$eval(
			'#students-list > li > a',
			(item) => {
				return item.map((e) => ({
					//@ts-ignore
					ref: e.href,
					student: e.innerHTML,
				}));
			}
		);
		this.students = data.map((e) => e.student);
		this.studentsIds = data.map((e) => e.ref.slice(e.ref.indexOf(':') + 1));
	}
	parseGrades(data: String) {
		const root = parse(data);
		let log_headers = false;
		let headers = [];
		let gradeInfo = [];
		root
			.querySelector('.linkDescList')
			.querySelector('tbody')
			.querySelectorAll('tr')
			.forEach((elem_I, index) => {
				elem_I.querySelectorAll('th').forEach((elem_II) => {
					const txt = elem_II.innerText;
					if (txt == 'Q1') {
						log_headers = true;
					} else if (txt == 'Absences') log_headers = false;
					if (log_headers) {
						headers.push(txt);
					}
				});
				elem_I.querySelectorAll('td').forEach((elem_II) => {
					if (index == 3) {
						gradeInfo.push([''], ['']);
					}
					let txt = elem_II.innerText;
					if (txt == '&nbsp;' || txt == '[ i ]') {
						txt = '';
					}
					gradeInfo[index - 3].push(txt);
				});
			});

		gradeInfo = gradeInfo.map((elem) =>
			elem.slice(elem.length - 9, elem.length)
		);
		for (let i = 0; i < gradeInfo.length; i++) {
			if (gradeInfo[i][0] == '') {
				gradeInfo = gradeInfo.slice(0, i);
				break;
			}
		}
		return [headers].concat(gradeInfo);
	}
	async fetchGrades(student: string) {
		// const self = this;
		// await this.page.evaluate(
		// 	eval(`() => {
		// 	${self.studentsIds[self.students.indexOf(student)]}
		// }`)
		// );
		// await this.page.waitForNavigation();
		// const html = await this.page.content();
		// fs.writeFile('out.txt', html, (err) => {
		// 	if (err) return console.log(err);
		// 	console.log('HTML WRITTEN');
		// });
		const self = this;
		await fs.readFile(
			'./src/maingrades.txt',
			'utf8',
			function (err, data: String) {
				if (err) throw err;
				self.grades = self.parseGrades(data);
				console.log(self.grades);
			}
		);
	}
	//'.linkDescList > tbody > [id^="ccid_"]'
};

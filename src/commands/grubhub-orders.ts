
import { GluegunCommand } from 'gluegun';
const _ = require('lodash');
// const lineReader = require('line-reader');
const { JSDOM } = require('jsdom')
const parse = require('parse-email')
const fs = require('fs');
const readline = require('readline');

const command: GluegunCommand = {
  name: 'grubhub-orders',
  run: async toolbox => {

    // @ts-ignore
    const { system, print, filesystem, strings } = toolbox
    print.info('Extracting Data from All Mail')

    let emailCount = 0;
    let lines: string[] = [];
    let results = {};

    const fileStream = fs.createReadStream('./data/in/All Mail');

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    // Note: we use the crlfDelay option to recognize all instances of CR LF
    // ('\r\n') in input.txt as a single line break.

    for await (const line of rl) {
      // Each line in input.txt will be successively available here as `line`.
      // console.log(`Line from file: ${line}`);
      if (/^From - /.test(line)) {
        emailCount++;
        console.log(emailCount);
        await processEmail(emailCount, lines, results);
        lines = [];
      }
      lines.push(line);
      if (emailCount > 54) {
        // writeLines();
        // return false;
      }
    }

    function writeLines() {
      const resultLines = Object.keys(results).map(key => {
        let values = Object.values(results[key]);
        values.unshift(key);
        values = values.map(value => value.toString().replace(/\n/, ''));
        return values.join(',');
      })
      fs.writeFileSync('./data/out/results.csv', resultLines.join('\n'));
      console.log('file written with ', Object.keys(resultLines).length, 'lines.');
    }
    writeLines();
  }

}
async function processEmail(emailCount: number, lines: string[], results: any) {
  if (!lines.length) { return; }
  return parse(lines.join('\n'))
      .then((email) => {
        try {
          const from = _.get(email, 'from.text');
          const subject = email.subject;
          if (!/Order /.test(subject)) {
            console.log('Skipping: ', subject);
            return;
          }
          if (/grubhub\.com.*Order/.test(from + ' ' + subject)) {
            return addGrubhubOrderToResults(email, results);
          }
          if (/EatStreet Orders/.test(from + ' ' + subject)) {
            return addEatStreetOrderToResults(email, results);
          }
          if (/grubhub\.com.*Order/.test(from + ' ' + subject)) {
            return addGrubhubOrderToResults(email, results);
          }

          console.log('line: ', emailCount, from, subject);

        } catch (e) {
          console.log('err')
          // console.log(email);
        }
      })
}

function addEatStreetOrderToResults(email: any, results: any) {
  const html = email.html;
  const dom: any = new JSDOM(html);
  const orderEl = dom.window.document.querySelector('#orderInfo');
  const data = JSON.parse(orderEl.innerHTML);
  const regex = /[()\- ]/g
  const phone = data.phoneNumber.replace(regex, '');
  results[phone] = {
    count: results[phone] ? results[phone].count + 1 : 0,
    type: 'eatstreet',
    name: '',
    address: data.streetAddress || '',
    number: data.apartment || '',
    city: data.city || '',
    zip: data.zip || '',
    date: data.deliverAt.slice(0, 10)
  }
}

function addGrubhubOrderToResults(email: any, results: any) {
  const html = email.html;
  const dom: any = new JSDOM(html);
  // const selector: string = 'body > table > tbody > tr > td > table > tbody > tr > td > table:nth-child(3) > tbody > tr > th:nth-child(2) > table > tbody > tr > th > div > div:nth-child(1) > div > div:nth-child(1)';
  // let el = dom.window.document.querySelector(selector);
  // const phoneSelector = 'a';
  const pickupTitleSelector = 'body > table > tbody > tr > td > table > tbody > tr > td > table:nth-child(3) > tbody > tr > th:nth-child(2) > table > tbody > tr > th > div > div:nth-child(2) > div > div:nth-child(1)';
  const pickupTitle = dom.window.document.querySelector(pickupTitleSelector);
  if (pickupTitle && pickupTitle.innerHTML.includes('Pickup')) {
    console.log('Pickup order');
    return;
  }
  let addressSelector = 'body > table > tbody > tr > td > table > tbody > tr > td > table:nth-child(3) > tbody > tr > th:nth-child(2) > table > tbody > tr > th > div > div:nth-child(2) > div';
  let addressBox = dom.window.document.querySelector(addressSelector);
  if (!addressBox) {
    addressSelector = 'body > table > tbody > tr > td > table > tbody > tr > td > table:nth-child(3) > tbody > tr > th:nth-child(2) > table > tbody > tr > th > div > div:nth-child(1) > div > div:nth-child(1)';
    addressBox = dom.window.document.querySelector(addressSelector);
  }
  if (!addressBox) {
    return ('Can not locate Address Box');
  }
  try {
    let phone = _.get(addressBox, 'lastElementChild.innerHTML', '');
    phone = phone.replace(/\D/g, '').replace(/^1/, '');
    if (!phone || (phone.length < 9)) {
      return;
    }
    const clean = item => _.trim(item.replace(/,/, ''));

    const divs = addressBox.getElementsByTagName('DIV');
    const name = clean(_.get(divs, '[1].innerHTML', ''));
    const address = clean(_.get(divs, '[2].innerHTML', ''));
    let number = clean(_.get(divs, '[3].innerHTML', ''));
    let city = clean(_.get(divs, '[4].innerHTML', '11111'));
    if (/New York/.test(number)) {
      city = number;
      number = '';
    }
    const zip = city ? clean(city.match(/\d+/)[0]) : '22222';
    const date = email.date;
    results[phone] = {
      count: results[phone] ? results[phone].count + 1 : 0,
      type: 'grubhub',
      name,
      address,
      number,
      city,
      zip,
      date: date.getUTCFullYear() + '-'
          + _.padStart((date.getUTCMonth() + 1), '2', '0')
          + '-' + _.padStart((date.getUTCDay() + 1), 2, '0')
    }
  } catch(e) {
    console.log('Unparsable at ', email.html);
  }
}

/*
function processHTMLEmail(lines: string[]) : void {

  const dom = new JSDOM(lines.join(''));
  const selectors = [
    { type: 'seamless', selector: '#orderInfo'},
    { type: 'grubhub', selector: 'body > table > tbody > tr > td > table > tbody > tr > td > table:nth-child(3) > tbody > tr > th:nth-child(2) > table > tbody > tr > th > div > div:nth-child(2)'}
  ]
  let matchFlag = false;
  for (let i = 0; i < selectors.length; i++) {
    let selector: any = selectors[i];
    const el = dom.window.document.querySelector(selector.selector);
    if (!el) {
      continue;
    }
    matchFlag = true;
    extractData(el, selector.type);
  }
  if (!matchFlag) {
    console.log('No Match')
  }
}

function extractData(el: any, elType: string) {
  let data: any = '';
  switch(elType) {
    case 'seamless':
      try {
        data = JSON.parse(el.textContent);
      } catch(e) {
        console.log(e, el.textContent);
      }
      console.log('Seamless', data.phoneNumber);
      break;
    default:
      console.log('grubhub')
      data = el.textContent;
      // console.log(data);
  }
}
*/

module.exports = command


/*
    // ...and be the CLI you wish to see in the world
    const awesome = strings.trim(await system.run('whoami'))
    const moreAwesome = strings.kebabCase(`${awesome} and a keyboard`)
    const contents = `🚨 Warning! ${moreAwesome} coming thru! 🚨`
    const home = process.env['HOME']
    filesystem.write(`${home}/realtalk.json`, { contents })

    print.info(`${print.checkmark} Citius`)
    print.warning(`${print.checkmark} Altius`)
    print.success(`${print.checkmark} Fortius`)

 */

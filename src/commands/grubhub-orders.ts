
import { GluegunCommand } from 'gluegun'
const lineReader = require('line-reader');

const command: GluegunCommand = {
  name: 'grubhub-orders',
  run: async toolbox => {

    // @ts-ignore
    const { system, print, filesystem, strings } = toolbox
    print.info('Extracting Data from All Mail')

    const htmlLines: string[] = [];
    lineReader.eachLine('./data/in/All Mail', function(line, last) {
      console.log(line);

      if (line.includes('<!DOCTYPE html>')) {
        return false; // stop reading
      }
    });

  },
}

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

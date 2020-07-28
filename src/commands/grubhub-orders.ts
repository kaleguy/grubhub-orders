
import { GluegunCommand } from 'gluegun'


const command: GluegunCommand = {
  name: 'grubhub-orders',
  run: async toolbox => {

    const { system, print, filesystem, strings } = toolbox
    print.info('Welcome to your CLI')

    // ...and be the CLI you wish to see in the world
    const awesome = strings.trim(await system.run('whoami'))
    const moreAwesome = strings.kebabCase(`${awesome} and a keyboard`)
    const contents = `🚨 Warning! ${moreAwesome} coming thru! 🚨`
    const home = process.env['HOME']
    filesystem.write(`${home}/realtalk.json`, { contents })

    print.info(`${print.checkmark} Citius`)
    print.warning(`${print.checkmark} Altius`)
    print.success(`${print.checkmark} Fortius`)
  },
}

module.exports = command

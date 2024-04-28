import fs from 'fs'
import YAML from 'yaml'
let pluginPath = './plugins/karin-plugin-qqbot/config/'

export default new class botyaml {
    async botip() {
        let yaml = YAML.parse(fs.readFileSync(pluginPath+'config/Bot.yaml', 'utf-8'))
        return yaml.botip
    }
    async botport() {
        let yaml = YAML.parse(fs.readFileSync(pluginPath+'config/Bot.yaml', 'utf-8'))
        return yaml.botport
    }
    async frport() {
        let yaml = YAML.parse(fs.readFileSync(pluginPath+'config/Bot.yaml', 'utf-8'))
        return yaml.frport
    }
}
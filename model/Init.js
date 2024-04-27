import fs from 'fs'
import YAML from 'yaml'
import botInit from './botInit.js'

export default new class QQBotInit {
  async Init () {
    logger.info(`Karin-plugin-QQBot 加载中...`)
    if (!fs.existsSync('./plugins/karin-plugin-qqbot/config/config/Bot.yaml')) {
      fs.copyFileSync('./plugins/karin-plugin-qqbot/config/defSet/Bot.yaml', './plugins/karin-plugin-qqbot/config/config/Bot.yaml')
      logger.mark('[botInit] 请在"./config/config/Bot.yaml"填写你的QQbot信息')
      return
    }
    let config = YAML.parse(fs.readFileSync(`./plugins/karin-plugin-qqbot/config/config/Bot.yaml`, `utf-8`))
    if (!config?.botid || !config?.clientSecret) return
    logger.info(`[botInit] QQBot初始化`)
    let Bot = new botInit(config)
    let acc_token = await Bot.getAccToken()
    await Bot.getWss(acc_token)
    await Bot.mwsc()
    await Bot.messageInit()
  }
}
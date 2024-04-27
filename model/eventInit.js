import { Bot } from '../../../lib/index.js'


class pluginLoader {
  async deal (e) {
    Bot.emit('message', e)
  }
}

export default new pluginLoader
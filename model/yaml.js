import YAML from 'yaml'
import fs from 'fs'
import chokidar from 'chokidar'

export default new class cfg {
  constructor() {
    this.configPath = './plugins/karin-plugin-qqbot/config/config/Bot.yaml'
  }

  initCfg() {
    let watcher = chokidar.watch(this.configPath)
    watcher.on('change', path => {
      logger.mark('[QQBot] 修改配置文件')
    })
  }

  get boid() {
    return this.YAMLparse('botid')
  }

  get clientSecret() {
    return this.YAMLparse('clientSecret')
  }

  get botip() {
    return this.YAMLparse('botip')
  }

  get botport() {
    return this.YAMLparse('botport')
  }

  get frport() {
    return this.YAMLparse('frport')
  }

  get markdown() {
    return this.YAMLparse('markdown')
  }

  get markdown_id() {
    return this.YAMLparse('markdown_id')
  }
 
  YAMLparse(value) {
    return YAML.parse(fs.readFileSync(this.configPath, 'utf-8'))[value]
  }
}
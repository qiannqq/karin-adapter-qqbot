import fs from 'fs'

export default new class ButtonLoad {
  async getButton (e) {
    let buttons = await this.localButton()
    for (let item of buttons) {
      const { app } = await import(`../Button/${item}`)
      let button = new app(e)
      let deal
      deal = await button.getReg(e.d.content.replace(/^\s/g, ''))
      if (!deal) continue
      let deal_result
      try {
        deal_result = await button[deal](e)
      } catch (error) {
        logger.error(`[${deal}]:${error}`)
        continue
      }
      if (!Array.isArray(deal_result)) continue
      let buttonList = []
      for (let item of deal_result) {
        if (item.label && item.data) buttonList.push({
          "buttons": [
            {
              "render_data": {
                "label": item.label,
                "visited_label": item.visited_label || item.label,
                "style": item.style || 1,
              },
              "action": {
                "type": 2,
                "permission": {
                  "type": 2
                },
                "data": item.data,
                "enter": item.enter || false
              }
            }
          ]
        })
      }
      return buttonList
    }
  }
  /**
   * 暂未支持
   */
  async traverseButton () {
    return
  }
  async localButton () {
    const files = fs
      .readdirSync('./plugins/karin-plugin-qqbot/Button')
      .filter((file) => file.endsWith('.js'))
    let result = []
    files.forEach((file) => {
      result.push(file)
    })
    return result
  }
}
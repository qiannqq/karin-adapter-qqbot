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
      let buttonLength = 0
      for (let item of deal_result) {
        let botton_s = []
        for (let i of item) {
          if(!i.label || !i.data) continue
          botton_s.push({
            "render_data": {
              "label": i.label,
              "visited_label": i.visited_label || i.label,
              "style": i.style || 1,
            },
            "action": {
              "type": 2,
              "permission": {
                "type": 2
              },
              "data": i.data,
              "enter": i.enter || false
            }
          })
        }
        buttonList[buttonLength] = { "buttons": botton_s }
        buttonLength++;
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
import WebSocket from 'ws'
import fs from 'fs'
import YAML from 'yaml'
import fetch from 'node-fetch'
import pluginLoader from './eventInit.js'
import { redis } from '../../../lib/index.js'
import httpServer from './httpInit.js'
import cfg from './yaml.js'
import sharp from 'sharp';
import ButtonLoad from './ButtonLoad.js'

export default class botInit {
  constructor (botConfig) {
    this.botid = botConfig.botid
    this.clientSecret = botConfig.clientSecret
    this.QQurl = ``
    this.acc_token = ``
    this.ws = {}
    this.session_id = ``
  }
  async getAccToken () {
    try {
      let body = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          appId: this.botid,
          clientSecret: this.clientSecret
        })
      }
      let acc_token = await fetch(`https://bots.qq.com/app/getAppAccessToken`, body)
      acc_token = await acc_token.json()
      this.acc_token = acc_token.access_token
      return this.acc_token
    } catch (error) {
      logger.error(`[botInit] QQBot初始化出错，请求鉴权接口失败`)
      logger.error(error)
    }
  }
  async getWss (acc_token) {
    let ws = new WebSocket('wss://api.sgroup.qq.com/websocket')
    ws.on('open', async () => {
      logger.mark(`[QQBot] 连接已开启 初始化鉴权消息`)
      let initSend = {
        op: 2,
        d: {
          token: `QQBot ${acc_token}`,
          intents: 33554432,
          shard: [0, 1],
          properties: {
            "$os": "linux",
            "$browser": "my_library",
            "$device": "my_library"
          }
        }
      }
      ws.send(JSON.stringify(initSend))
      logger.mark(`[QQBot] 鉴权消息已发送 等待服务端回应`)
    })
    this.ws = ws
    return
  }
  async mwsc (d) {
    setTimeout(async () => {
      let Nd = await this.send(d);
      this.mwsc(Nd);
    }, 50000);
  }

  async send (d) {
    if (!this.ws) {
      logger.mark(`[QQBot] 心跳Error: WS连接不存在`)
      return `NO`
    }
    if (!this.d) this.d = d || null;
    let sendJSON = {
      op: 1,
      d: this.d
    };
    logger.debug(`[QQBot] 发送心跳校验 { op: 1, d: ${this.d} }`)
    try {
      this.ws.send(JSON.stringify(sendJSON));
    } catch (error) {
      logger.error(`[QQBot] 心跳发送失败`)
      logger.error(error)
    }
    return this.d
  }
  async messageInit () {
    this.ws.on('message', async (data) => {
      data = JSON.parse(data);
      if (data.op === 10) {
        logger.info(`[QQBot] 连接初始化 已接收网关消息`)
        return
      }
      if (data.t === 'READY') {
        logger.info(`[QQBot] ${data.d.user.username} 建立连接成功`)
        this.session_id = data.d.session_id
        return
      }
      if (data.op === 0 && data.t === 'GROUP_AT_MESSAGE_CREATE') {
        logger.debug(`[QQBot] 收到消息事件`)
        logger.debug(data)
        await pluginLoader.deal(await this.dealMessage(data))
      } else if (data.op !== 11) {
        logger.debug(`[QQBot] 收到WS事件：`)
        logger.debug(data)
      }
      this.d = data.s;
    });
    this.ws.on('close', async (data) => {
      if(await this.parsingCloseCode(data)) {
        logger.error(`[QQBot] 连接异常断开(${data}) 执行重连程序`)
        await this.reconnect()
      }
    })
  }
  async parsingCloseCode(data) {
    switch(data) {
      case 4001:
        logger.error(`[QQBot] 连接断开 ${logger.red(`无效的 opcode`)}`)
        return false
      case 4002:
        logger.error(`[QQBot] 连接断开 ${logger.red(`无效的 payload`)}`)
        return false
      case 4010:
        logger.error(`[QQBot] 连接断开 ${logger.red(`无效的 shard`)}`)
        return false
      case 4012:
        logger.error(`[QQBot] 连接断开 ${logger.red(`无效的 version`)}`)
        return false
      case 4013:
        logger.error(`[QQBot] 连接断开 ${logger.red(`无效的 intent`)}`)
        return false
      case 4014:
        logger.error(`[QQBot] 连接断开 ${logger.red(`intent 无权限`)}`)
        return false
      case 4914:
        logger.error(`[QQBot] 连接断开 ${logger.red(`机器人已下架,只允许连接沙箱环境`)}`)
        return false
      case 4915:
        logger.error(`[QQBot] 连接断开 ${logger.red(`机器人已封禁,不允许连接,申请解封后再连接`)}`)
        return false
    }
    return true
  }
  async dealMessage(data) {
    return {
      event: 'message',
      self_id: this.botid,
      user_id: data.d.author.id,
      group_id: data.d.group_id,
      message_id: data.d.id,
      message_seq: data.s,
      raw_message: data.d.content,
      contact: {
        scene: "group",
        peer: data.d.group_id
      },
      sender: {
        uid: data.d.author.id,
        uin: data.d.author.id,
      },
      elements: [
        { type: 'text', text: data.d.content.replace(/^\s/g, '') }
      ],
      msg: '',
      reply: async () => {
        logger.error(`[QQBot] 发送消息失败：reply已不再提供，${logger.red(`请更新karin`)}`)
      },
      replyCallback: async (msg) => {
        if (cfg.markdown) return await this.SendMarkdown(msg, data)
        let msg_seq
        try {
          msg_seq = JSON.parse(await redis.get(`QQBot:${data.d.id}`))
        } catch { }
        if (!msg_seq) {
          msg_seq = 1
        } else {
          msg_seq++
        }
        await redis.set(`QQBot:${data.d.id}`, JSON.stringify(msg_seq), { EX: 300 })
        let bodyContent = {
          content: '',
          msg_type: 0,
          msg_id: data.d.id,
          msg_seq,
        }
        for (let item of msg) {
          if (item.type === 'text') {
            bodyContent.content += item.text
            continue
          }
          if (item.type === 'image') {
            let imagePath = await httpServer.writeImage(item.file)
            let mediaBody = {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `QQBot ${await this.getAccToken()}`,
                'X-Union-Appid': this.botid
              },
              body: JSON.stringify({
                file_type: 1,
                url: `http://${cfg.botip || await httpServer.getLocalIP()}:${cfg.frport || cfg.botport}/image/${imagePath}`,
                srv_send_msg: false
              })
            }
            logger.mark(`http://${cfg.botip || await httpServer.getLocalIP()}:${cfg.frport || cfg.botport}/image/${imagePath}`)
            let mediaResult
            try {
              mediaResult = await fetch(`https://api.sgroup.qq.com/v2/groups/${data.d.group_id}/files`, mediaBody)
              mediaResult = await mediaResult.json()
            } catch { }
            logger.debug(mediaResult)
            bodyContent.media = { file_info: mediaResult.file_info }
            bodyContent.msg_type = 7
            continue
          }
          if (item.type === `at`) continue
          if(item.type === `markdown`) {
            logger.mark(`[QQBot] 未启用markdown`)
            continue
          }
          logger.error(`[QQBot] 不支持的消息类型:${item.type}`)
          continue
        }
        let body = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `QQBot ${await this.getAccToken()}`,
            'X-Union-Appid': this.botid
          },
          body: JSON.stringify(bodyContent)
        }
        let result
        try {
          result = await fetch(`https://api.sgroup.qq.com/v2/groups/${data.d.group_id}/messages`, body)
          result = await result.json()
          if (result.id) {
            return result
          }
          logger.error(`发送消息错误: ${msg}`)
          logger.error(result)
          return
        } catch (error) {
          logger.error(`发送消息错误; ${msg}`)
          logger.error(error)
          return
        }
      }
    }
  }
  async reconnect () {
    let ws = new WebSocket('wss://api.sgroup.qq.com/websocket');
    ws.on('open', async (data) => {
      logger.debug(data)
      logger.mark(`[QQBot] 连接已开启 发送重连payload`);
      let initSend = {
        op: 6,
        d: {
          token: `QQBot ${await this.getAccToken()}`,
          session_id: this.session_id,
          seq: this.d
        }
      };
      logger.debug(initSend)
      ws.send(JSON.stringify(initSend));
      logger.mark(`[QQBot] 重连payload已发送 等待服务端回应`);
    });
    ws.once('message', async (data) => {
      data = JSON.parse(data)
      logger.mark(data)
      ws.once('message', async (data) => {
        data = JSON.parse(data)
        logger.debug(data)
        if (data.op === 9) {
          logger.error(`[QQBot] 重连失败`)
          process.exit()
        }
        if (data.op === 0) {
          logger.mark(`[QQBot] 重连成功，已重新初始化监听程序`)
          delete this.ws;
          this.ws = ws;
          this.messageInit()
        }
      })
    })
    return ws;
  }
  // async testClose () {
  //   this.ws.close()
  // }
  async SendMarkdown (msg, data) {
    let msg_seq
    try {
      msg_seq = JSON.parse(await redis.get(`QQBot:${data.d.id}`))
    } catch { }
    if (!msg_seq) {
      msg_seq = 1
    } else {
      msg_seq++
    }
    await redis.set(`QQBot:${data.d.id}`, JSON.stringify(msg_seq), { EX: 300 })
    let bodyContent = {
      content: ' ',
      msg_type: 2,
      msg_id: data.d.id,
      msg_seq,
      markdown: {
        custom_template_id: cfg.markdown_id || '1145141919810'
      }
    }
    let ButtonList = await ButtonLoad.getButton(data)
    if (Array.isArray(ButtonList) && ButtonList.length > 0) {
      bodyContent.keyboard = {
        content: { rows: ButtonList, bot_appid: this.botid }
      }
    }
    for (let item of msg) {
      if (item.type === 'at') {
        if (!bodyContent.markdown.params) {
          bodyContent.markdown.params = [
            {
              key: 'text_start',
              values: [
                `<@${item.uid}>`
              ]
            }
          ]
        } else {
          bodyContent.markdown.params[0].values[0] += `<@${item.uid}>`
        }
        continue
      }
      if (item.type == 'text') {
        item.text = item.text.replace(/\n/g, '\r')
        if (!bodyContent.markdown.params) {
          bodyContent.markdown.params = [
            {
              key: 'text_start',
              values: [
                item.text
              ]
            }
          ]
        } else {
          bodyContent.markdown.params[0].values[0] += item.text
        }
        continue
      }
      if (item.type === 'image') {
        let imagePath = await httpServer.writeImage(item.file)
        let imagePX = await this.measureImageSize(`./plugins/karin-plugin-qqbot/temp/${imagePath}`)
        if (!bodyContent.markdown.params) {
          bodyContent.markdown.params = [
            {
              key: 'img_dec', values: [`图片 #${imagePX.width}px #${imagePX.height}px`]
            },
            {
              key: 'img_url', values: [`http://${cfg.botip || await httpServer.getLocalIP()}:${cfg.frport || cfg.botport}/image/${imagePath}`]
            }
          ]
        } else {
          bodyContent.markdown.params.push(
            {
              key: 'img_dec', values: [`图片 #${imagePX.width}px #${imagePX.height}px`]
            }
          )
          bodyContent.markdown.params.push(
            {
              key: 'img_url', values: [`http://${cfg.botip || await httpServer.getLocalIP()}:${cfg.frport || cfg.botport}/image/${imagePath}`]
            }
          )
        }
        logger.mark(`http://${cfg.botip || await httpServer.getLocalIP()}:${cfg.frport || cfg.botport}/image/${imagePath}`)
        continue
      }
      if(item.type === 'button') {
        if(!bodyContent.keyboard) {
          bodyContent.keyboard = {
            content: { rows: [ { buttons: item.buttons } ], bot_appid: this.botid }
          }
        } else {
          bodyContent.keyboard.content.rows.push({ buttons: item.buttons })
        }
        continue
      }
      if(item.type === 'markdown') continue
      logger.error(`[QQBot] 不支持的消息类型:${item.type}`)
    }
    let body = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `QQBot ${await this.getAccToken()}`,
        'X-Union-Appid': this.botid
      },
      body: JSON.stringify(bodyContent)
    }
    let result
    try {
      result = await fetch(`https://api.sgroup.qq.com/v2/groups/${data.d.group_id}/messages`, body)
      result = await result.json()
      if (result.id) {
        return result
      }
      logger.error(`发送消息错误: ${msg}`)
      logger.error(result)
      return
    } catch (error) {
      logger.error(`发送消息错误; ${msg}`)
      logger.error(error)
      return
    }
  }
  async measureImageSize (imagePath) {
    try {
      const metadata = await sharp(imagePath).metadata();
      return {
        width: metadata.width,
        height: metadata.height
      };
    } catch (error) {
      logger.error('Error measuring image size:', error);
      throw error;
    }
  }
}
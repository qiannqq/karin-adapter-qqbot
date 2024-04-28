import WebSocket from 'ws'
import fs from 'fs'
import YAML from 'yaml'
import fetch from 'node-fetch'
import pluginLoader from './eventInit.js'
import { redis } from '../../../lib/index.js'

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
        // logger.info(`收到消息 <= ${data.d.group_id}:${data.d.author.id}: ` + data.d.content.replace(/^\s/g, ''));
        logger.debug(data)
        let Ne = {
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
          reply: async (msg) => {
            let msg_seq
            try {
              msg_seq = JSON.parse(await redis.get(`QQBot:${data.d.id}`))
            } catch {}
            if(!msg_seq) {
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
            for(let item of msg) {
              if(item.type === 'text') bodyContent.content += item.text
              if(item.type === 'image') return
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
        await pluginLoader.deal(Ne)
      } else if (data.op !== 11) {
        logger.info(`收到WS事件：`)
        logger.info(data)
      }
      this.d = data.s;
    });
    this.ws.on('close', async (data) => {
      logger.error(`[QQBot] 连接异常断开(${data}) 执行重连程序`)
      await this.reconnect()
    })
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
  async testClose () {
    this.ws.close()
  }
}
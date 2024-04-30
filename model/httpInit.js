import http from 'http'
import fs from 'fs'
import os from 'os'
import cfg from './yaml.js'
let pluginPath = `./plugins/karin-plugin-qqbot/`

export default new class httpServer {
    async init() {
        const server = http.createServer(async (req,res) => {
            if(!/^\/image\/(.*)/.test(req.url)) {
                res.writeHead(404)
                res.end()
                return
            }
            let imagePath = req.url.match(/^\/image\/(.*)/)[1]
            res.writeHead(200, {'Content-Type': 'text/plain'})
            if(!fs.existsSync(`./plugins/karin-plugin-qqbot/temp/${imagePath}`)) {
                res.writeHead(404)
                res.end()
                return
            }
            let image = fs.readFileSync(`./plugins/karin-plugin-qqbot/temp/${imagePath}`)
            res.writeHead(200, {
                'Content-Type': 'image/jpeg',
                'Content-Disposition': 'inline'
            });
            res.end(image)
        })
        server.listen(cfg.botport)
    }
    async writeImage(data) {
        if(!/^base64:\/\//.test(data)) return
        data = data.replace(/^base64:\/\//, '');
        if(!fs.existsSync(pluginPath+'temp')) {
            fs.mkdirSync(pluginPath+'temp')
        }
        let times = Date.now()
        let number = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')
        fs.writeFileSync(pluginPath+`temp/qqbot${times}${number}.jpg`, data, `base64`)
        setTimeout(async () => {
            fs.unlinkSync(pluginPath+`temp/qqbot${times}${number}.jpg`)
        }, 60000)
        return `qqbot${times}${number}.jpg`
    }
    async getLocalIP() {
        const interfaces = os.networkInterfaces();
        let localIP = null;
      
        Object.keys(interfaces).forEach((iface) => {
          interfaces[iface].forEach((ifaceInfo) => {
            if (ifaceInfo.family === 'IPv4' && !ifaceInfo.internal) {
              localIP = ifaceInfo.address;
            }
          });
        });
      
        return localIP;
      }
}
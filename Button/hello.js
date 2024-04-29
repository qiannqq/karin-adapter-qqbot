export class app {
    constructor (e) {
        this.e = e
    }
    async getReg(msg) { //函数名必须为getReg，函数内返回获取按钮的函数名称
        switch(true) {
            case /^hello$/.test(msg):
                return 'helloWorld'
            case /^#help$/.test(msg):
                return 'help'
        }
        return false
    }
    async helloWorld(e) {
        let Button = [ { label: '你好', visited_label: '你好', style: 1, data: '/你好', enter: false } ]
        /**
         * label 按钮文字 必须
         * visited_label 按钮点击后的文字 可选
         * style 按钮颜色 0为灰 1为蓝 可选
         * data 点击按钮后回复的消息内容 必须
         * enter 是否直接发出消息 可选
         */
        return Button
    }
    async help(e) {
        return true
    }
}
## Karin-plugin-QQBot
### 简介
该插件目前仍处在测试阶段，不支持原生markdown，不支持纯文模板markdown
### 安装指令
#### Github (Gitee和Github安装指令任选其一)
```
git clone --depth=1 https://github.com/qiannqq/karin-plugin-qqbot.git ./plugins/karin-plugin-qqbot
```
#### Gitee 国内加速源
```
git clone --depth=1 https://gitee.com/qiannqq/karin-plugin-qqbot.git ./plugins/karin-plugin-qqbot
```
#### 使用pnpm安装依赖
```
pnpm i
```
### markdown 设置教程
<details><summary>图文消息</summary>

模板名称：图文消息

使用场景：发送图文混排消息

请复制后去除源码前后的 ` 标记

Markdown 源码：

```
{{.text_start}}![{{.img_dec}}]({{.img_url}}){{.text_end}}
```

配置模板参数
| 模板参数   | 参数示例                                                          号位文字 |
| ---------- | -------------------------------------------------------------------------- |
| text_start | 开头文字                                                          号位文字 |
| img_dec    | 图片                                                              号位文字 |
| img_url    | https://qqminiapp.cdn-go.cn/open-platform/11d80dc9/img/robot.b167c62c.png  |
| text_end   | 结束文字                                                          号位文字 |

保存 → 提交审核 → 审核完成<br>
打开plugins/karin-plugin-qqbot/config/config/Bot.yaml，填写markdown_id为你的模板ID，并开启markdown消息

</details>

<details><summary>纯文模板</summary>

**纯文模板待支持中...**

</details>

### 参与贡献

1. Fork本仓库
2. 提交代码
3. 新建 PR
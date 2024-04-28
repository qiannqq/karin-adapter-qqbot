import fs from 'fs';
import YAML from 'yaml';

let cfg = {};

function loadConfig() {
  try {
    const configPath = './plugins/karin-plugin-qqbot/config/config/Bot.yaml';
    const config = YAML.parse(fs.readFileSync(configPath, 'utf8'));
    cfg = config;
  } catch (error) {}
}

loadConfig();

fs.watch('./plugins/karin-plugin-qqbot/config/config/Bot.yaml', (event, filename) => {
  if (event === 'change') {
    loadConfig();
  }
});

export default cfg;

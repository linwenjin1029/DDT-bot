require('dotenv').config();
const fs = require('fs');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const cronModule = require('node-cron');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// 📢 發送嵌入式公告
function sendAnnouncement(title, content) {
  const channel = client.channels.cache.get(process.env.CHANNEL_ID);
  if (!channel) return console.log('❌ 找不到頻道');

  const embed = new EmbedBuilder()
    .setColor(0xffcc00)
    .setTitle(`📢 ${title}`)
    .setDescription(content)
    .setFooter({ text: 'WJ 公告機器人', iconURL: client.user.displayAvatarURL() })
    .setTimestamp();

  channel.send({ embeds: [embed] });
}

// 🗓️ 讀取 JSON 並註冊排程
function loadSchedules() {
  const raw = fs.readFileSync('./schedule.json', 'utf8');
  const scheduleList = JSON.parse(raw);

  scheduleList.forEach(({ cron, title, content }) => {
    cronModule.schedule(cron, () => {
      sendAnnouncement(title, content);
    }, { timezone: 'Asia/Taipei' });
  });

  console.log(`✅ 已載入 ${scheduleList.length} 筆排程`);
}

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  loadSchedules();

  // 🗓️ 每月最後一天排程（特殊判斷）
  cronModule.schedule('0 21 28-31 * *', () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (tomorrow.getDate() === 1) {
      sendAnnouncement('彈彈莊園', '莊園幣將於每月月末清零！請記得使用完畢！');
      sendAnnouncement('活躍點', '活躍點將於每月月末清零！請記得使用完畢！');
    }
  }, { timezone: 'Asia/Taipei' });
});

// 🧠 指令：新增排程（永久儲存）
client.on('messageCreate', message => {
  if (!message.content.startsWith('!新增排程')) return;

  const args = message.content.split(' ');
  if (args.length < 7) return message.reply('❌ 格式錯誤，請使用：`!新增排程 <cron> <主題> <內容>`');

  const cronTime = args.slice(1, 6).join(' ');
  const title = args[6];
  const content = args.slice(7).join(' ');

  try {
    // 寫入 JSON
    const raw = fs.readFileSync('./schedule.json', 'utf8');
    const scheduleList = JSON.parse(raw);
    scheduleList.push({ cron: cronTime, title, content });
    fs.writeFileSync('./schedule.json', JSON.stringify(scheduleList, null, 2));

    // 即時註冊
    cronModule.schedule(cronTime, () => {
      sendAnnouncement(title, content);
    }, { timezone: 'Asia/Taipei' });

    message.reply(`✅ 已新增排程：\`${cronTime}\` → **${title}**`);
  } catch (err) {
    console.error(err);
    message.reply('❌ 新增失敗，請確認 cron 格式是否正確');
  }
});

client.login(process.env.TOKEN);
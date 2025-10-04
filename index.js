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

const activeJobs = []; // 儲存已註冊的排程物件

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
    const job = cronModule.schedule(cron, () => {
      sendAnnouncement(title, content);
    }, { timezone: 'Asia/Taipei' });

    activeJobs.push(job);
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

// 🧠 指令區塊
client.on('messageCreate', message => {
  if (message.author.bot) return;

  // ✅ 新增排程指令
  if (message.content.startsWith('!新增排程')) {
    const args = message.content.split(' ');
    if (args.length < 7) return message.reply('❌ 格式錯誤，請使用：`!新增排程 <cron> <主題> <內容>`');

    const cronTime = args.slice(1, 6).join(' ');
    const title = args[6];
    const content = args.slice(7).join(' ');

    try {
      const raw = fs.readFileSync('./schedule.json', 'utf8');
      const scheduleList = JSON.parse(raw);
      scheduleList.push({ cron: cronTime, title, content });
      fs.writeFileSync('./schedule.json', JSON.stringify(scheduleList, null, 2));

      const job = cronModule.schedule(cronTime, () => {
        sendAnnouncement(title, content);
      }, { timezone: 'Asia/Taipei' });

      activeJobs.push(job);

      message.reply(`✅ 已新增排程：\`${cronTime}\` → **${title}**`);
    } catch (err) {
      console.error(err);
      message.reply('❌ 新增失敗，請確認 cron 格式是否正確');
    }
  }

  // ✅ 查詢排程指令
  if (message.content === '!查詢排程') {
    const raw = fs.readFileSync('./schedule.json', 'utf8');
    const scheduleList = JSON.parse(raw);

    if (scheduleList.length === 0) return message.reply('📭 目前沒有任何排程');

    let reply = '📅 目前排程如下：\n';
    scheduleList.forEach((item, index) => {
      reply += `\n🔢 編號：${index}\n🕒 時間：\`${item.cron}\`\n📌 主題：**${item.title}**\n📝 內容：${item.content}\n`;
    });

    message.reply(reply);
  }

  // ✅ 刪除排程指令
  if (message.content.startsWith('!刪除排程')) {
    const args = message.content.split(' ');
    if (args.length !== 2 || isNaN(args[1])) return message.reply('❌ 請使用正確格式：`!刪除排程 <編號>`');

    const index = parseInt(args[1]);
    const raw = fs.readFileSync('./schedule.json', 'utf8');
    const scheduleList = JSON.parse(raw);

    if (index < 0 || index >= scheduleList.length) return message.reply('❌ 編號超出範圍');

    const removed = scheduleList.splice(index, 1)[0];
    fs.writeFileSync('./schedule.json', JSON.stringify(scheduleList, null, 2));

    if (activeJobs[index]) {
      activeJobs[index].stop();
      activeJobs.splice(index, 1);
    }

    message.reply(`🗑️ 已刪除排程：**${removed.title}**（${removed.cron}）`);
  }

  // ✅ 編輯排程指令
  if (message.content.startsWith('!編輯排程')) {
    const args = message.content.split(' ');
    if (args.length < 4) return message.reply('❌ 格式錯誤，請使用：`!編輯排程 <編號> <欄位> <新內容>`');

    const index = parseInt(args[1]);
    const field = args[2];
    const newValue = args.slice(3).join(' ');

    const raw = fs.readFileSync('./schedule.json', 'utf8');
    const scheduleList = JSON.parse(raw);

    if (isNaN(index) || index < 0 || index >= scheduleList.length) {
      return message.reply('❌ 編號超出範圍');
    }

    if (!['cron', 'title', 'content'].includes(field)) {
      return message.reply('❌ 欄位錯誤，只能修改 `cron`、`title` 或 `content`');
    }

    if (activeJobs[index]) {
      activeJobs[index].stop();
      activeJobs.splice(index, 1);
    }

    scheduleList[index][field] = newValue;
    fs.writeFileSync('./schedule.json', JSON.stringify(scheduleList, null, 2));

    const { cron, title, content } = scheduleList[index];
    const job = cronModule.schedule(cron, () => {
      sendAnnouncement(title, content);
    }, { timezone: 'Asia/Taipei' });

    activeJobs[index] = job;

    message.reply(`✏️ 已成功修改第 ${index} 筆排程的 **${field}** 為：\`${newValue}\``);
  }
});

client.login(process.env.TOKEN);
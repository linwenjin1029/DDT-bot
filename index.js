require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const cron = require('node-cron');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const sendAnnouncement = (title, content) => {
  const channel = client.channels.cache.get(process.env.CHANNEL_ID);
  if (!channel) return console.log('❌ 找不到頻道');

  const embed = new EmbedBuilder()
    .setColor(0xffcc00)
    .setTitle(`📢 ${title}`)
    .setDescription(content)
    .setFooter({ text: 'WJ 公告機器人', iconURL: client.user.displayAvatarURL() })
    .setTimestamp();

  channel.send({ embeds: [embed] });
};

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  sendAnnouncement('測試公告', '這是一則手動測試的公告訊息');


  // 🗓️ 每日公告
  cron.schedule('0 12 * * *', () => sendAnnouncement('試煉之地', '試煉之地以開啟！12:00-14:00'), { timezone: 'Asia/Taipei' });
  cron.schedule('30 19 * * *', () => sendAnnouncement('試煉之地', '試煉之地以開啟！19:30-21:30'), { timezone: 'Asia/Taipei' });
  cron.schedule('0 14 * * *', () => sendAnnouncement('世界BOSS', '遠古巨龍已出現！'), { timezone: 'Asia/Taipei' });
  cron.schedule('0 19 * * *', () => sendAnnouncement('世界BOSS', '足球隊長已出現！'), { timezone: 'Asia/Taipei' });
  cron.schedule('30 18 * * *', () => sendAnnouncement('聯賽', '聯賽已開啟！18:30-19:50'), { timezone: 'Asia/Taipei' });
  cron.schedule('30 21 * * *', () => sendAnnouncement('聯賽', '聯賽已開啟！21:30-24:00'), { timezone: 'Asia/Taipei' });
  cron.schedule('0 18 * * *', () => sendAnnouncement('巔峰競技', '巔峰競技已開啟！18:00-19:00'), { timezone: 'Asia/Taipei' });
  cron.schedule('0 18 * * *', () => sendAnnouncement('寵物大作戰', '寵物大作戰已開啟！18:00-23:00'), { timezone: 'Asia/Taipei' });

  // 🗓️ 每週公告
  cron.schedule('0 20 * * 2,4,6,0', () => sendAnnouncement('王者擂台', '王者擂台已開啟！20:00-21:00'), { timezone: 'Asia/Taipei' });
  cron.schedule('30 19 * * 2,4,6', () => sendAnnouncement('飛飛樂', '飛飛樂已開啟！19:30-20:00'), { timezone: 'Asia/Taipei' });
  cron.schedule('0 21 * * 0', () => sendAnnouncement('VIP積分', 'VIP積分將於每周一清零！請記得使用完畢！'), { timezone: 'Asia/Taipei' });

  // 🗓️ 每月公告（最後一天）
  cron.schedule('0 21 28-31 * *', () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (tomorrow.getDate() === 1) {
      sendAnnouncement('彈彈莊園', '莊園幣將於每月月末清零！請記得使用完畢！');
      sendAnnouncement('活躍點', '活躍點將於每月月末清零！請記得使用完畢！');
    }
  }, { timezone: 'Asia/Taipei' });
});

client.login(process.env.TOKEN);

sendAnnouncement('測試公告', '這是一則手動測試的公告訊息');
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.BOT_TOKEN;
const miniAppUrl = process.env.MINI_APP_URL || 'https://notelab.vercel.app';

if (!token) {
  console.error('ERROR: BOT_TOKEN must be set in .env');
  console.log('Get token from @BotFather on Telegram');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

console.log('🤖 Notelab bot started');
console.log('Mini App URL:', miniAppUrl);

// Start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from.username || msg.from.first_name;
  
  bot.sendMessage(chatId, 
    `👋 Salom, ${username}!\n\n` +
    `Notelab — shaxsiy workspace'ingiz.\n\n` +
    `🎬 Kinolar\n` +
    `📚 Kitoblar\n` +
    `🎮 O'yinlar\n` +
    `✈️ Sayohatlar\n\n` +
    `Boshlash uchun quyidagi tugmani bosing:`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🚀 Notelab ochish', web_app: { url: miniAppUrl } }],
          [{ text: '📖 Yordim', callback_data: 'help' }]
        ]
      }
    }
  );
});

// Help command
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  
  bot.sendMessage(chatId,
    `📖 *Notelab Yordam*\n\n` +
    `*/start* — Botni ishga tushirish\n` +
    `*/help* — Yordam ko'rsatma\n\n` +
    `Web ilovada:\n` +
    `• Yangi note yaratish\n` +
    `• Guruh va elementlar qo'shish\n` +
    `• AI yordamchi bilan muloqot\n\n` +
    `Maslahat: Desktop versiyasi ham mavjud!`,
    { parse_mode: 'Markdown' }
  );
});

// Callback queries (button clicks)
bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  
  if (query.data === 'help') {
    bot.sendMessage(chatId,
      `Notelab — bu shaxsiy boshqaruv tizimi.\n\n` +
      `💡 *Misol foydalanish:*\n` +
      `1. "Inception filmini ko'rmoqchiga qo'sh"\n` +
      `2. "O'qilgan kitoblarni ro'yxatla"\n` +
      `3. "Yangi guruh yarat"\n\n` +
      `AI yordamchi (@agelab) har bir bo'limda alohida ishlaydi.`,
      { parse_mode: 'Markdown' }
    );
  }
  
  bot.answerCallbackQuery(query.id);
});

// Handle web app data
bot.on('web_app_data', (msg) => {
  const chatId = msg.chat.id;
  const data = msg.web_app_data.data;
  
  console.log('Web app data received:', data);
  bot.sendMessage(chatId, 'Ma\'lumot qabul qilindi: ' + data);
});

// Error handling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

bot.on('error', (error) => {
  console.error('Bot error:', error);
});

console.log('Bot is polling for messages...');

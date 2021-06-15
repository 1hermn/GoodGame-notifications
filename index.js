const { Telegraf, Markup, Scenes, session } = require('telegraf');
const config = require('./config.json')
const tools = require('./tools.js')
const mongoose = require('mongoose');
const fs = require("fs");

//TODO: User offset

mongoose.Promise = require('bluebird');
mongoose.connect(`mongodb://${config.mongo.login}:${config.mongo.pass}@${config.mongo.ip_port}/${config.mongo.name}?authSource=admin`, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})

const db = mongoose.connection
db.on('error', err => {
    console.log('error', err)
})

db.once('open', () => {
    console.log('Подключено к базе данных')
})

var stage_array = [];
files = fs.readdirSync("./scenes/")
files.forEach(file => {
    if (!file.endsWith(".js")) return;
    const { scene } = require(`./scenes/${file}`)
    let methoddName = file.split(".")[0];
    console.log("Сцена", methoddName, " загружена")
    stage_array.push(scene)
});

const stage = new Scenes.Stage(stage_array)

const bot = new Telegraf(config.token)

bot.use(session());
bot.use(stage.middleware())


bot.command("start", ctx => {
    ctx.reply("ВНИМАНИЕ. Администрация сервиса goodgame.ru не имеет отношения к этому боту. Бот работает на API"+
        "этого сервиса и не требует вашего логина и пароля.\n\nПозволяет получать уведомления о появившимся анонсе "+
        "стрима, а также об начале стрима(по времени анонса).\nДля подключения бота введите команду /register\nДля " +
        "просмотра подписок введите /favorites"
    )
})

bot.command("help", ctx => {
    ctx.reply("Что умеет бот: получать текущие стримы из ваших подписок и уведомлять вас о начале стримов (по аннонсам). Последнее находится в ооочень ранним тестировани " + 
    "так я предпологаю, что всё ещё не всё знаю об API гугдгейма. Обо всех ошибках сообщайте на форум [https://goodgame.ru/topic/123817]\nКоманды: \n/help - Показать эту страницу\n/register - Зарегистрировать аккаунт в боте. Поддерживает только один аккаунт на один телеграм аккаунт)\n/favorites - Список подписок")
})

bot.catch(async (err, ctx) =>{
    ctx.reply("Произошла ошибка, свяжитесь с администратором")
    console.log("Ошибка: ", err)
})



bot.command("register", ctx => {
    ctx.scene.enter("register")
})


bot.command("favorites", async ctx => {
    var msg = await tools.getFavoritesMsg(ctx.message.from.id)
    ctx.reply(msg)
})
async function start() {
    await bot.launch()
    console.log("Телеграм-клиент запущен")
    await tools.startAgenda(bot)
}
start()
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

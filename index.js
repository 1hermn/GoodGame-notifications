const { Telegraf, Markup, Scenes, session } = require('telegraf');
const config = require('./config.json')
const tools = require('./tools.js')
const mongoose = require('mongoose');
const fs = require("fs");
var restify = require('restify');

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
        "просмотра подписок введите /favorites " +
        "помощь на команду /help"
    )
})

bot.command("help", ctx => {
    ctx.reply("Что умеет бот: получать текущие стримы из ваших подписок и уведомлять вас о начале стримов " +
        "(по аннонсам). Последнее находится в ооочень ранним тестировани так я предпологаю, что всё ещё не всё знаю " +
        "об API гугдгейма. Обо всех ошибках сообщайте на форум [https://goodgame.ru/topic/123817]" +
        "\nКоманды: \n/help - Показать эту страницу\n/" + "register - Зарегистрировать аккаунт в боте. " +
        "Поддерживает только один аккаунт на один телеграм аккаунт)" +
        "\n/favorites - Список подписок")
})

bot.catch(async (err, ctx) =>{
    ctx.reply("Произошла ошибка, свяжитесь с администратором")
    console.log("Ошибка: ", err)
})


bot.command("register", ctx => {
    ctx.scene.enter("register")
})


bot.command("favorites", async ctx => {
    ctx.scene.enter("favorites")
})

bot.command("choose", ctx => {
    ctx.scene.enter("choose")
})

async function respond(req, res, next) {
    console.log(req.query)
    const arr = req.query.state.split('_')
    if(arr[1] !== undefined) {
        var decrypted = await tools.decrypt(arr[1])
        if (decrypted === Number(arr[0])) {
            var found = await tools.chekUserById(Number(arr[0]))

            if (found) {
                var ans = await tools.register(Number(arr[0]), req.query.code)
                console.log(ans)
                if (ans == 0) {
                    res.send("Произошла ошибка. Возможно вышло время действия токена или он отправлен не правильно. Повторите ваши действия")
                } else {
                    res.send("Авторизация прошла успешно. Вы можете посмотреть информацию о своих подписках командой /favorites в боте")
                    bot.telegram.sendMessage(Number(req.query.code), "Вы успешно зарегистрировались. С этой минуты бот начинает" +
                        "получать анонсы от всех стримеров. Если вы хотите выбрать определённыех, введите команду /choose")
                }
            } else {
                res.send("Уже есть аккаунт")
            }
        }else {
            res.send("Но-но, плохо пытаться ломать моего бота")
        }
    }else {
        res.send("Но-но, плохо пытаться ломать моего бота")
    }
    next();
}

async function start() {
    await bot.launch()
    console.log("Телеграм-клиент запущен")
    await tools.startAgenda(bot)
}

var server = restify.createServer();
server.use(restify.plugins.acceptParser(server.acceptable));
server.use(restify.plugins.jsonp());
server.use(restify.plugins.bodyParser({
    mapParams: true
}));

server.get('/token', respond);

server.listen(80, function() {
    console.log('%s listening at %s', server.name, server.url);
});

start()
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

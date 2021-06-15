const { Scenes, Markup } = require('telegraf');
const config = require('../config.json')
const tools = require('../tools.js')
/*TODO: Предлагать:
    Выбрать язык
    Выбрать смещение по времени
*/
/*TODO:
    добавить редирект на страницу сервера и опрос получен ли результат
*/
const registerScene = new Scenes.WizardScene(
    'register',
    (ctx) => {
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.url("Перейти",`https://api2.goodgame.ru/oauth/authorize?response_type=code&client_id=${config.gg.client_id}&redirect_uri=/oauth/receivecode&scope=user.favorites&state=123`)]
        ])
        ctx.reply("Для регистрации аккаунта в боте перейдите по ссылке, следуйте инструкциям и получите токен," +
            " который нужно отправить в бота сообщением, содержащим только токен. Внимание! Как только Вам показали " +
            "страницу с токеном тут же отправляйте, токен действителен только 30 секунд\nПо этому эти действия желательно выполнять с копьютера", keyboard)
        return ctx.wizard.next()
    },
    async (ctx) => {
        if(ctx.message) {
            ctx.reply("Ваш токен: " + ctx.message.text + "\nРегистрирую Вас у себя в базе...")
            var ans = await tools.register(ctx.message.from.id, ctx.message.text)
            if(ans == 0){
                ctx.reply("Произошла ошибка. Возможно вышло время действия токена или он отправлен не правильно.")
            }else {
                ctx.reply("Вы успешно зарегистрировались. Получаю информацию о ваших подписках..")
                var msg = await tools.getFavoritesMsg(ctx.message.from.id)
                ctx.reply(msg)
            }
            ctx.scene.leave()
        }
    }
)

module.exports = {
    scene: registerScene
}
const { Scenes, Markup } = require('telegraf');
const config = require('../config.json')
const tools = require('../tools.js')
/*TODO: Предлагать:
    Выбрать язык
    Выбрать смещение по времени
*/


const registerScene = new Scenes.WizardScene(
    'register',
   async (ctx) => {
        var found = await tools.chekUserById(ctx.message.from.id)
        if(found) {
            const date = new Date()
            const timestamp = date.getTime()
            const keyboard = Markup.inlineKeyboard([
                [Markup.button.url("Перейти", `https://api2.goodgame.ru/oauth/authorize?response_type=code&client_id=${config.gg.client_id}&redirect_uri=http://398241-hermn.tmweb.ru/token&scope=user.favorites&state=${ctx.message.from.id}`)]
            ])
            ctx.reply("Для регистрации аккаунта в боте перейдите по ссылке и разрешите боту получать список подписок", keyboard)
        }else {
            ctx.reply("На один телеграм аккаунт только один пользователь!")
            return ctx.scene.enter("choose")
        }
    })


module.exports = {
    scene: registerScene
}
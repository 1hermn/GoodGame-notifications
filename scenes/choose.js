const { Scenes, Markup } = require('telegraf');
const config = require('../config.json')
const tools = require('../tools.js')

const chooseScene = new Scenes.WizardScene(
    'choose',
    async(ctx) => {
        ctx.reply("Получаю информацию о ваших подписках..")
        ctx.session.user = {}
        ctx.session.user.id = ctx.message.from.id
        ctx.session.user.page = 0
        ctx.session.user.objects = await tools.getFavoritesMsg(ctx.session.user.id)
        try {
            const buttons = await generate_menu(ctx)
            if (buttons[0][0].callback_data == undefined) {
                ctx.reply("Ошибка, зарегистрируйтесь в боте")
                return ctx.scene.leave()
            }
            const inline = Markup.inlineKeyboard(buttons)
            ctx.reply("✅ - уведомления приходят. ❌ - уведомлений нет. Для изменения нажмите на стримера", inline)
        } catch (e) {
            ctx.reply("Ошибка, зарегистрируйтесь в боте")
            return ctx.scene.leave()
        }
        return ctx.wizard.next()
    },
    async(ctx) => {
        if (ctx.update.callback_query) {
            switch (ctx.update.callback_query.data) {
                case "exit":
                    {
                        await ctx.answerCbQuery("Выхожу")
                        ctx.deleteMessage()
                        return ctx.scene.leave()
                    }
                case "back":
                    {
                        try {
                            let tmp = Number(ctx.session.user.page) - 3
                            ctx.session.user.page = (tmp >= 3) ? tmp : 0;
                            var buttonsArray = await generate_menu(ctx)
                            var inline = Markup.inlineKeyboard(buttonsArray)
                            ctx.editMessageText("✅ - уведомления приходят. ❌ - уведомлений нет. Для изменения нажмите на стримера",
                                inline)
                        } catch (e) {
                            throw "Не найдено!"
                        } finally {
                            ctx.answerCbQuery("Выполнено!")
                        }
                        break;
                    }
                case "forward":
                    {
                        try {
                            let tmp = Number(ctx.session.user.page) + 3
                            ctx.session.user.page = tmp
                            var buttonsArray = await generate_menu(ctx)
                            var inline = Markup.inlineKeyboard(buttonsArray)
                            ctx.editMessageText("✅ - уведомления приходят. ❌ - уведомлений нет. Для изменения нажмите на стримера",
                                inline)
                        } catch (e) {
                            console.log(e)
                            throw "Не найдено2"
                        } finally {
                            ctx.answerCbQuery("Выполнено!")
                        }
                        break;
                    }
                case "save":
                    {
                        await tools.updateUserStreamers(ctx.session.user.objects[0], ctx.session.user.id)
                        await ctx.answerCbQuery("Сохранено")
                        ctx.deleteMessage()
                        return ctx.scene.leave()
                    }
                default:
                    {
                        //search in objects
                        for (var i = 0; i < ctx.session.user.objects[0].length; i++) {
                            if (ctx.session.user.objects[0][i].id === Number(ctx.update.callback_query.data)) {
                                ctx.session.user.objects[0][i].sendNotification = !ctx.session.user.objects[0][i].sendNotification
                                ctx.answerCbQuery("Изменено")
                                var buttonsArray = await generate_menu(ctx)
                                var inline = Markup.inlineKeyboard(buttonsArray)
                                ctx.editMessageText("✅ - уведомления приходят. ❌ - уведомлений нет. Для изменения нажмите на стримера",
                                    inline)
                            }
                        }
                    }
            }
        }

    }
)

async function generate_menu(ctx) {
    let buttonsArray = [];
    try {

        length = ctx.session.user.objects[1].length
        console.log("Before: ", ctx.session.user.page)
            //FIXME
        let count = (ctx.session.user.page - 3 >= 0) ? ctx.session.user.page - 3 : 0
        for (var i = count, k = 0; i < length && k < 3; ++i, k++) {
            var object = ctx.session.user.objects[1][i]
            buttonsArray.push([Markup.button.callback((ctx.session.user.objects[0][i].sendNotification ? "✅" : "❌") + object.streamer, object.streamer_id)])
            ctx.session.user.page = i;
        }
        console.log("After: ", ctx.session.user.page)
        buttonsArray.push([Markup.button.callback("Сохранить", "save")])
        buttonsArray.push([Markup.button.callback("Закончить просмотр", "exit")])


        const div = (x, y) => x / y >> 0 // деление на цело
        const page = div(ctx.session.user.page, 3)
        const countOfAllPage = div(length + 3 - 1, 3) // деление с круглением вверх

        if (page == 0) { // если это первая страница
            if (countOfAllPage > 1) { // если стримеров больше чем на одну страницу
                console.log(countOfAllPage)
                buttonsArray.push([
                    Markup.button.callback('📝' + (page + 1) + "/" + countOfAllPage, "noth"),
                    Markup.button.callback("➡️", "forward"),
                ])
            } else { // если все влезают в одну страницу
                buttonsArray.push([
                    Markup.button.callback('📝' + "1" + "/" + "1", "noth"),
                ])
            }
        } else if (page == length - 1) { // если это последняя страница
            buttonsArray.push([
                Markup.button.callback("⬅️", "back"),
                Markup.button.callback('📝' + (page + 1) + "/" + countOfAllPage, "noth"),
            ])
        } else { // страница посередине
            buttonsArray.push([
                Markup.button.callback("⬅️", "back"),
                Markup.button.callback('📝' + (page + 1) + "/" + countOfAllPage, "noth"),
                Markup.button.callback("➡️", "forward"),
            ])
        }
    } catch (e) {
        console.log(e)
        throw "Не найдено!"
    }
    return buttonsArray
}

module.exports = {
    scene: chooseScene
}
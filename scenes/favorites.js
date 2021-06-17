const { Scenes, Markup } = require('telegraf');
const config = require('../config.json')
const tools = require('../tools.js')


const favoritesScene = new Scenes.WizardScene(
    'favorites',
    async (ctx) => {
        ctx.reply("Получаю информацию о ваших подписках..")
        ctx.session.user = {}
        ctx.session.user.id = ctx.message.from.id
        ctx.session.user.page = 0
        const buttons = await generate_menu(ctx)
        if(buttons[0][0].callback_data == undefined){
            ctx.reply("Ошибка, зарегистрируйтесь в боте")
            return ctx.scene.leave()
        }
        try {
            const inline = Markup.inlineKeyboard(buttons)
            ctx.reply("Выберите стримера, чтобы посмотреть информацию о нём", inline)
        }catch (e) {
            ctx.reply("Ошибка, зарегистрируйтесь в боте")
            return ctx.scene.leave()
        }
        return ctx.wizard.next()
    },
    async (ctx) => {
        if(ctx.update.callback_query){
            switch (ctx.update.callback_query.data){
                case "exit": {
                    await ctx.answerCbQuery("Выхожу")
                    ctx.deleteMessage()
                    return ctx.scene.leave()
                }
                case "back":{
                    try{
                        let tmp = Number(ctx.session.user.page) - 3
                        ctx.session.user.page = (tmp >= 3) ? tmp : 0;
                        var buttonsArray = await generate_menu(ctx)
                        var inline = Markup.inlineKeyboard(buttonsArray)
                        ctx.editMessageText("Выберите стримера, чтобы посмотреть информацию о нём",
                            inline)
                    }catch(e) {
                        throw "Не найдено!"
                    }finally {
                        ctx.answerCbQuery("Выполнено!")
                    }
                    break;
                }
                case "forward": {
                    try{
                        let tmp = Number(ctx.session.user.page) + 3
                        ctx.session.user.page =  tmp
                        var buttonsArray = await generate_menu(ctx)
                        var inline = Markup.inlineKeyboard(buttonsArray)
                        ctx.editMessageText("Выберите стримера, чтобы посмотреть информацию о нём",
                            inline)
                    }catch(e) {
                        console.log(e)
                        throw "Не найдено2"
                    }finally {
                        ctx.answerCbQuery("Выполнено!")
                    }
                    break;
                }
                default: {
                    //search in objects
                    let text = ""
                    for(let i = 0; i < ctx.session.user.objects[1].length; i++) {
                        if(ctx.session.user.objects[1][i].streamer == ctx.update.callback_query.data){
                            text = ctx.session.user.objects[1][i].text
                            break;
                        }
                    }
                    if(text != ""){
                        var keyboard = Markup.inlineKeyboard([
                            [Markup.button.callback("Назад","back")]
                        ])
                        ctx.editMessageText(text,
                            keyboard)
                        return ctx.wizard.next();
                    }
                }
            }
        }else {
            ctx.reply("Получаю информацию о ваших подписках..")
            ctx.session.user = {}
            ctx.session.user.id = ctx.message.from.id
            ctx.session.user.page = 0
            const buttons = await generate_menu(ctx)
            const inline = Markup.inlineKeyboard(buttons)
            ctx.reply("Выберите стримера, чтобы посмотреть информацию о нём", inline)
        }

    },
    async (ctx) => {
        if(ctx.update.callback_query) {
            switch (ctx.update.callback_query.data) {
                case "back": {
                    const buttons = await generate_menu(ctx)
                    const inline = Markup.inlineKeyboard(buttons)
                    ctx.editMessageText("Выберите стримера, чтобы посмотреть информацию о нём", inline)
                    return ctx.wizard.back();
                }
            }
        }else {
            const buttons = await generate_menu(ctx)
            const inline = Markup.inlineKeyboard(buttons)
            ctx.reply("Выберите стримера, чтобы посмотреть информацию о нём", inline)
            return ctx.wizard.back();
        }
    }
)

async function generate_menu(ctx){
    let buttonsArray = [];
    try{
        ctx.session.user.objects = await tools.getFavoritesMsg(ctx.session.user.id)
        length = ctx.session.user.objects[1].length
        console.log("Before: ", ctx.session.user.page)
        //FIXME
        let count = ( ctx.session.user.page - 3 >= 0) ? ctx.session.user.page - 3 : 0
        for(var i = count, k = 0; i < length && k < 3; ++i, k++){
            var object = ctx.session.user.objects[1][i]
            buttonsArray.push([Markup.button.callback(object.streamer,object.streamer)])
            ctx.session.user.page = i;
        }
        console.log("After: ", ctx.session.user.page)
        buttonsArray.push([Markup.button.callback("Закончить просмотр", "exit")])
        if(ctx.session.user.page / 3 >= 0 && ctx.session.user.page / 3 <= 1){
            if(length/3 >= 1){
                console.log(Math.round(length/3))
                buttonsArray.push([
                    Markup.button.callback('📝' + Math.round(ctx.session.user.page / 3) + "/" + Math.round(length/3) + `+ ${length % 3}`,"noth"),
                    Markup.button.callback("➡️","forward")
                ])
            }else {
                buttonsArray.push([
                    Markup.button.callback('📝' + "1" + "/" + "1","noth")
                ])
            }
        }else if(ctx.session.user.page / 3 > 1){
            if(Math.round(ctx.session.user.page / 3) === Math.round(length/3)){
                buttonsArray.push([
                    Markup.button.callback("⬅️","back"),
                    Markup.button.callback('📝' + Math.round(ctx.session.user.page / 3) + "/" + Math.round(length/3) + `+ ${length % 3}`,"noth")
                ])
            }else {
                buttonsArray.push([
                    Markup.button.callback("⬅️","back"),
                    Markup.button.callback('📝' + Math.round(ctx.session.user.page / 3) + "/" + Math.round(length/3) + `+ ${length % 3}`,"noth"),
                    Markup.button.callback("➡️","forward")
                ])
            }
        }
    }catch(e) {
        console.log(e)
        throw "Не найдено!"
    }
    return buttonsArray
}

module.exports = {
    scene: favoritesScene
}
const fetch = require('node-fetch');
const mongoose = require('mongoose');
const { User } = require("./models/User.js");
const config = require('./config.json')
const Agenda = require('agenda');

//TODO: StreamRemain

var bt;

const agenda = new Agenda({ db: { address: `mongodb://${config.mongo.login}:${config.mongo.pass}@${config.mongo.ip_port}/${config.mongo.name}?authSource=admin` , options: {
            useNewUrlParser: true,
            useUnifiedTopology: true
        }}
});

agenda.define(
    "sendNotification",
    { priority: "high", concurrency: 10 },
    async (job) => {
        const { to, streamer, start, game, streamName, link } = job.attrs.data;

        var date = new Date()
        //TODO: offcet
        var strt = new Date(start*1000 - 5*60*1000)
        var dif = ( strt - date ) / 1000

        var str = "Скоро начнётся стрим!(Через 5 минут)\n"
        str+=`Стример: ${streamer}\n`
        str+=`Ссылка: ${link}\n`
        str+=`Игра: ${game}\n`
        str+=`Название стрима: ${streamName}\n`
        bt.telegram.sendMessage(to, str)

    }
);

async function startAgenda(bot){
    console.log(`mongodb://${config.mongo.login}:${config.mongo.pass}@${config.mongo.ip_port}/${config.mongo.name}?authSource=admin`)
    bt = bot;
    agenda.define("updateAnnounces", async (job) => {
        await updateAnnounces(bot)
    });
    await agenda.start();
    await agenda.every("5 minutes", "updateAnnounces");
    console.log("Планировщик задач запущен на обновление каждые 5 минут")
}

async function register(userId, code){
    const body = {
        redirect_uri: "http://398241-hermn.tmweb.ru/token",
        client_id: config.gg.client_id,
        client_secret: config.gg.client_secret,
        code: code,
        grant_type : "authorization_code"
    }
    const res = await fetch("https://api2.goodgame.ru/oauth", {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
    })
    const status = res.status
    const json = await res.json()
    console.log(json)
    if(status != 200){
        return 0
    }else {
        const result = await addUser(userId, json)
        return result
    }
}

async function addUser(userId, json) {
    //получаем имя
    const res = await fetch("https://goodgame.ru/api/4/" + "user", {
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${json.access_token}`
        }
    })
    const JSON = await res.json()
    const usr = await User.create({
        name: JSON.username,
        ggId: JSON.id,
        telegramId: userId,
        access_token: json.access_token,
        refresh_token: json.refresh_token
    })
    const err = await usr.save()
    if (err.name === undefined) {
        return 0
    }
    console.log("Новый пользователь сохранён,", usr);
    return 1
}

async function chekUserById(userId){
    var usr = await User.findOne({telegramId: Number(userId)})
    console.log(usr == null)
    return usr == null
}

async function  getUserToken(userId){
    var usr = await User.findOne({telegramId: Number(userId)})
    if(usr != null && usr.access_token !== undefined){
        return usr.access_token
    }else {
        return 0
    }
}

async function updateUser(userId){
    const usr = await User.findOne({telegramId: Number(userId)})
    body = {
        "grant_type": "refresh_token",
        "refresh_token": usr.refresh_token,
        "client_id": config.gg.client_id,
        "client_secret": config.gg.client_secret
    }
    const res = await fetch("https://api2.goodgame.ru/oauth", {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
    })

    const json = await res.json()
    console.log(json)
    var user = await User.findOne({telegramId: Number(userId)})
    user.access_token = json.access_token
    user.refresh_token = json.refresh_token
    await user.save()
}

async function ggGet(userId, path) {
    const token = await getUserToken(userId)
    if(token != 0) {
        const res = await fetch("https://goodgame.ru/api/4/" + path, {
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${token}`
            }
        })
        updateUser(userId)
        const json = await res.json()
        return json
    }
    return token
}

function timeConverter(UNIX_timestamp){
    var a = new Date(UNIX_timestamp * 1000);
    var months = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
    var year = a.getFullYear();
    var month = months[a.getMonth()];
    var date = a.getDate();
    var hour = a.getHours();
    var min = a.getMinutes();
    var sec = a.getSeconds();
    if (hour   < 10) {hour   = "0"+hour;}
    if (min < 10) {min = "0"+min;}
    if (sec < 10) {sec = "0"+sec;}
    var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec ;
    return time;
}

async function updateUserStreamers(array, userId){
    var user = await User.findOne({telegramId: Number(userId)})
    user.favorites = array
    await user.save()
}

async function parseFavoritesFor(json, send){
    var obj = {
        "streamer": json.streamer.nickname,
        "streamer_id": json.streamer.obj_key.split(':')[1],
        "send": send,
        "text": `\nСтример: ${json.streamer.nickname}`+
                `\nСсылка:${json.link}\nСостояние: ${(json.status) ? `\n\tСтримит игру: ${json.game}`+
                `\n\tНазвание стрима: ${json.stream_title}\n${(json.broadcast != false) ?
                `\tСтрим начался: ${timeConverter(json.broadcast.start)}` : `Начало стрима неизвестно`}` :
                `Не стримит. \nАнонс: ${(json.broadcast != false) ? `\n\tНачало: `+
                `${timeConverter(json.broadcast.start)}\n\tИгра: ${json.broadcast.game}`+`
                \n\tНазвание: ${json.broadcast.title}` : `Анонс отсуствует`}`}`
    }
    return obj
}

async function parseAnnounces(json) {
    return("Обнаружен новый анонс: \n" +
    `\n\tСтример: ${json.streamer.nickname}\n\t`+
    `Ссылка:${json.link}\n\tНачало: ${timeConverter(json.broadcast.start)}`
    +`\n\tИгра: ${json.broadcast.game}\n\tНазвание: ${json.broadcast.title}`)

}

async function getFavoritesById(userId, streamerId){
    var fav = await User.findOne({ telegramId: Number(userId) })
    for(let i = 0; i < fav.favorites.length; i++){
        if(fav.favorites[i].id == streamerId){
            return fav.favorites[i]
        }
    }
    return false
}

async function getFavoritesMsg(userId){
    var json = await ggGet(userId, "favorites")
    if(json != 0) {
        var objects = []
        var streamers_arr = []
        if (json[0] !== undefined) {
            for (var i = 0; i < json.length; i++) {
                //Найти стримера в базе. Если надено - получить инфу, но не добавлять в базу
                //если не найдено - добавить
                var fav = await getFavoritesById(userId, json[i].streamer.obj_key.split(':')[1])
                if(fav !== false){
                    var obj = fav
                    if(json[i].broadcast != false){
                        obj.announce_timestamp = json[i].broadcast.start
                    }
                }else {
                    var obj = {
                        id: json[i].streamer.obj_key.split(':')[1],
                        announce_timestamp: 0,
                        firstNotification: false,
                        secondNotification: false,
                        sendNotification: false
                    }
                    if(json[i].broadcast != false){
                        obj.announce_timestamp = json[i].broadcast.start
                    }
                }
                streamers_arr.push(obj)
                var parsedObj = await parseFavoritesFor(json[i], obj.sendNotification)
                objects.push(parsedObj)
            }
        }else {
            var fav = await getFavoritesById(userId, json.streamer.obj_key.split(':')[1])
            if(fav !== false){
                var obj = fav
            }else {
                var obj = {
                    id: json.streamer.obj_key.split(':')[1],
                    announce_timestamp: 0,
                    firstNotification: false,
                    secondNotification: false,
                    sendNotification: false
                }
            }
            if(json.broadcast != false){
                obj.announce_timestamp = json.broadcast.start
            }
            streamers_arr.push(obj)
            var parsedObj = await parseFavoritesFor(json, json.streamer.obj_key.split(':')[1])
            objects.push(parsedObj)
            
        }
        var un = [streamers_arr, objects]
        await updateUserStreamers(streamers_arr,userId)
        return un
    }
    return "Ошибка"
}

async function findAnnounce(bot, user){
    //пользователя
    const json = await ggGet(user.telegramId, "favorites")
    if (json[0] !== undefined) {
        for(var i = 0; i < json.length; i++) {
            //поиск стримера
            var notFound = true
            if(json[i].broadcast != false) {
                var send;
                for (var j = 0; j < user.favorites.length; j++) {
                    if (user.favorites[j].id == json[i].streamer.obj_key.split(':')[1]) {
                        send = user.favorites[j].sendNotification
                        //найден стример.
                        notFound = false
                        if (( user.favorites[j].announce_timestamp < json[i].broadcast.start) && send) {
                            if (!user.favorites[j].firstNotification || user.favorites[j].announce_timestamp != json[i].broadcast.start) {
                                user.favorites[j].announce_timestamp = json[i].broadcast.start
                                var msg = await parseAnnounces(json[i])
                                bot.telegram.sendMessage(user.telegramId, msg)
                                user.favorites[j].firstNotification = true
                            }
                            var date = new Date()
                            var start = new Date(json[i].broadcast.start*1000)
                            var dif = Math.round(( start - date ) / 60000)
                            console.log(dif)
                            agenda.schedule(start, "sendNotification", {
                                to: user.telegramId,
                                link: json[i].link,
                                game: json[i].broadcast.game,
                                streamName: json[i].broadcast.title,
                                streamer: json[i].streamer.nickname,
                                start: start
                            })
                            console.log("Задача добавлена.")
                            break;
                        }
                    }
                }
                if (notFound) {
                    var msg = await parseAnnounces(json[i])
                    bot.telegram.sendMessage(user.telegramId, msg)
                    let obj = {
                        sendNotification: false,
                        id: json[i].streamer.obj_key.split(':')[1],
                        announce_timestamp: json[i].broadcast.start,
                        firstNotification: true,
                        secondNotification: false
                    }
                    var date = new Date()
                    var start = new Date(json[i].broadcast.start*1000)
                    var dif = Math.round(( start - date ) / 60000)
                    console.log(dif)
                    agenda.schedule(start, "sendNotification", {
                        to: user.telegramId,
                        link: json[i].link,
                        game: json[i].broadcast.game,
                        streamName: json[i].broadcast.title,
                        streamer: json[i].streamer.nickname,
                        start: start
                    })
                    console.log("Задача добавлена.")
                    user.favorites.push(obj)
                }
            }
        }
    }else {
        if(json.broadcast != false) {
            var notFound = true
            for (var j = 0; j < user.favorites.length; j++) {
                if (user.favorites[j].id == json.streamer.obj_key.split(':')[1]) {
                    //найден стример.
                    send = user.favorites[j].sendNotification
                    notFound = false
                    if (( user.favorites[j].announce_timestamp < json.broadcast.start) && send) {
                        if (!user.favorites[j].firstNotification || user.favorites[j].announce_timestamp != json.broadcast.start) {
                            user.favorites[j].announce_timestamp = json.broadcast.start
                            var msg = await parseAnnounces(json)
                            bot.telegram.sendMessage(user.telegramId, msg)
                            user.favorites[j].firstNotification = true
                        }
                        var date = new Date()
                        var start = new Date(json.broadcast.start*1000)
                        var dif = Math.round(( start - date ) / 60000)
                        console.log(dif)
                        agenda.schedule(start, "sendNotification", {
                            to: user.telegramId,
                            link: json.link,
                            game: json.broadcast.game,
                            streamName: json.broadcast.title,
                            streamer: json.streamer.nickname,
                            start: start
                        })
                        console.log("Задача добавлена.")
                        break;
                    }
                }
            }
            if (notFound) {
                var msg = await parseAnnounces(json)
                bot.telegram.sendMessage(user.telegramId, msg)
                user.favorites[j].firstNotification = true
                let obj = {
                    sendNotification: false,
                    id: json.streamer.obj_key.split(':')[1],
                    announce_timestamp: json.broadcast.start,
                    firstNotification: true,
                    secondNotification: false
                }
                var date = new Date()
                var start = new Date(json.broadcast.start*1000)
                var dif = Math.round(( start - date ) / 60000)
                console.log(dif)
                agenda.schedule(start, "sendNotification", {
                    to: user.telegramId,
                    link: json.link,
                    game: json.broadcast.game,
                    streamName: json.broadcast.title,
                    streamer: json.streamer.nickname,
                    start: start
                })
                console.log("Задача добавлена.")
                user.favorites.push(obj)
            }
        }
    }
    await user.save()
}

async function updateAnnounces(bot){
    console.log("Начинаю плановое обновление")
    const users = await User.find()
    if(users != null){
        if(users[0] != undefined) {
            for (let i = 0; i < users.length; i++){
                await findAnnounce(bot, users[i])
            }
        }else {
            await findAnnounce(bot, users)
        }
    }
}

module.exports = {
    register,
    ggGet,
    getFavoritesMsg,
    updateAnnounces,
    startAgenda,
    updateUserStreamers,
    chekUserById
}

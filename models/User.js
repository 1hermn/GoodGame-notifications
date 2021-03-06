const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userScheme = new Schema({
    name: String,
    ggId: Number,
    telegramId: Number,
    access_token: String,
    refresh_token: String,
    favorites: [
        {
            id: Number,
            stream: Boolean,
            announce_timestamp: Number,
            firstNotification: Boolean,
            secondNotification: Boolean,
            sendNotification: {type: Boolean, default: false}
        }
    ],
    hash_secret: String
});

const User = mongoose.model("User", userScheme);
module.exports = {
    User: User
}

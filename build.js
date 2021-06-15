const MongoClient = require("mongodb").MongoClient;
const package = require("./package.json")
const fs = require("fs");

async function readDB(){
    console.log(`mongodb://${process.env.LOGIN}:${process.env.PASS}@${process.env.IPPORT}?authSource=admin`)
    const mongoClient = new MongoClient(`mongodb://${process.env.LOGIN}:${process.env.PASS}@${process.env.IPPORT}?authSource=admin`, { useUnifiedTopology: true });
    const client = await mongoClient.connect()

    const db = client.db("BotsConfig");
    const collection = db.collection("JSONConfig");
    const json = (await collection.find({bot_name: package.name}).toArray())[0]
    fs.writeFileSync('config.json', JSON.stringify((json.config)).toString())
}

readDB()
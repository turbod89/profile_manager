const settings = require('../settings');
const mongoose = require('mongoose');

mongoose.Promise = Promise;

const db = {};

for (let connection_name in settings.mongodb.connections) {
    const connection_data = settings.mongodb.connections[connection_name];

    const { user, password, host, port, database} = connection_data;
    const mongoDB = `mongodb://${user}:${password}@${host}:${port}/${database}`;
    mongoose.connect(mongoDB, {useCreateIndex: true,useNewUrlParser: true, useFindAndModify: false});
    db[connection_name] = mongoose.connection;
    db[connection_name].on('error', console.error.bind(console, 'MongoDB connection error:'));
}

module.exports = db[settings.mongodb.use];
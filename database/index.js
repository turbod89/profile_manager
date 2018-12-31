const settings = require('../settings');
const mongoose = require('mongoose');

mongoose.Promise = Promise;

const connection_name = settings.mongodb.use;

const connection_data = settings.mongodb.connections[connection_name];

const { user, password, host, port, database} = connection_data;
const mongoDB = user === null ? `mongodb://${host}:${port}/${database}` : `mongodb://${user}:${password}@${host}:${port}/${database}`;
mongoose.connect(mongoDB, {useCreateIndex: true,useNewUrlParser: true, useFindAndModify: false});
db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

module.exports = db;
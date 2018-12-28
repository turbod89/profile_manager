// import npm modules
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const timestamps = require('mongoose-timestamp');
const mongooseStringQuery = require('mongoose-string-query');

const fs = require('fs');
const path = require('path');

const settings = require('../settings');

const privacy_types = ['private','public'];

// build user schema
const ApiSchema = new Schema(
    {
        name: {
            type: String,
            lowercase: true,
            trim: true,
            index: true,
            unique: true,
            required: true,
        },
        token: {
            type: String,
            trim: false,
            required: true,
            unique: true,
            index: true,
        },
    },
    { collection: 'apis' },
);


/*
    Virtuals
*/

ApiSchema.virtual('storage')
    .get(function () {
        return path.resolve(settings.storage.path + '/' + this.token);
    });


/*
    Generate files
*/

ApiSchema.pre('save', function pre_save_create_folder(next) {

    if ( !fs.existsSync(this.storage)) {
        fs.mkdirSync(this.storage);
    }

    next();
});



// require plugins
ApiSchema.plugin(timestamps); // automatically adds createdAt and updatedAt timestamps
ApiSchema.plugin(mongooseStringQuery); // enables query capabilities (e.g. ?foo=bar)

module.exports = exports = mongoose.model('Api', ApiSchema); // export model for use
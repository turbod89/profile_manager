// import npm modules
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const timestamps = require('mongoose-timestamp');
const mongooseStringQuery = require('mongoose-string-query');

const path = require('path');
const fs = require('fs');
const uuidv4 = require('uuid/v4');
const md5 = require('md5');

const settings = require('../settings');

const getExtension = function (m) {
    if (m === 'image/jpeg') {
        return 'jpg';
    } else if (m === 'image/png') {
        return 'png';
    }

    return null;
};

const ImageSchema = new Schema(
    {
        api: {
            type: Schema.Types.ObjectId,
            ref: 'Api',
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: 'Profile',
        },

        name: {
            type: String,
            trim: false,
            required: true,
            unique: true,
            index: true,
        },

        original_name: {
            type: String,
            trim: false,
            required: true,
            index: true,
        },

        mimetype: {
            type: String,
            enum: settings.profileImages.acceptedMimeTypes,
            required: true,
        },

        custom_data: {
            type: Object,
            required: false,
            default: null,
        },

        storage: {
            type: String,
            default: null,
        },
        url: {
            type: String,
            default: null,
        },

        privacy: {
            type: String,
            enum: settings.privacy_types,
            default: 'private',
        },

        deleted: {
            type: Boolean,
            default: false,
        },
        deletedAt: {
            type: Date,
            default: null,
        }
    },
    { collection: 'images' },
);

/*
    Virtuals
*/

ImageSchema.virtual('fd')
    .get(function () {
       return path.resolve(this.storage + '/' + this.name);
    });

/*
    Generate name
*/
ImageSchema.pre('validate', function pre_validate_set_pre_computed(next) {
    if ( typeof this.name === 'undefined' || this.name === null || this.name === '' ) {
        this.name = md5(uuidv4()) + '.' + getExtension(this.mimetype);
    }
    this.api = this.owner.api;
    this.storage = path.resolve(this.owner.storage + '/' + 'images');
    this.url = '/profiles/' + this.owner.username + '/img/' + this.name;
    next();
});


/*
    Generate files
*/

ImageSchema.pre('validate', function pre_save_create_folder(next) {

    if ( !fs.existsSync(this.storage)) {
        fs.mkdirSync(this.storage);
    }

    next();
});

/*
    Methods
*/

ImageSchema.method('setNewName',async function () {
    this.name = md5(uuidv4()) + '.' + getExtension(this.mimetype);
    return this;
});

ImageSchema.method('unlinkFromUser', async function () {

    // const owner = (this.owner instanceof mongoose.model('Profile') ) ? this.owner : ( await mongoose.model('Profile').findById(this.owner) );
    const owner_id = (this.owner instanceof mongoose.model('Profile') ) ? this.owner._id : this.owner;
    await mongoose.model('Profile').updateOne({ '_id': owner_id }, {'$pullAll': { 'images': [this._id] } });

    this.owner = null;
    await mongoose.model('Image').updateOne({'_id': this._id},{owner: null});

    return this;
});

// require plugins
ImageSchema.plugin(timestamps); // automatically adds createdAt and updatedAt timestamps
ImageSchema.plugin(mongooseStringQuery); // enables query capabilities (e.g. ?foo=bar)

module.exports = exports = mongoose.model('Image', ImageSchema); // export model for use
// import npm modules
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const timestamps = require('mongoose-timestamp');
const mongooseStringQuery = require('mongoose-string-query');

const path = require('path');
const fs = require('fs');
const uuidv4 = require('uuid/v4');
const md5 = require('md5');
const settings  = require('../settings');

const image_sizes = []

const ProfileSchema = new Schema(
    {
        api: {
            type: Schema.Types.ObjectId,
            ref: 'Api',
        },
        email: {
            type: String,
            lowercase: true,
            trim: true,
            index: true,
            unique: true,
            required: true,
        },
        username: {
            type: String,
            lowercase: true,
            trim: true,
            index: true,
            unique: true,
            required: true,
        },
        name: {
            first: {
                type: String,
                trim: true,
                default: '',
            },
            last: {
                type: String,
                trim: true,
                default: '',
            },
        },
        token: {
            type: String,
            trim: false,
            required: true,
            unique: true,
            index: true,
        },
        bio: {
            type: String,
            trim: true,
            default: '',
        },
        images: [{
            type: Schema.Types.ObjectId,
            ref: 'Image',
        }],
        url: {
            type: String,
            trim: true,
            default: '',
        },
        twitter: {
            type: String,
            trim: true,
            default: '',
        },
        background: {
            type: Number,
            default: 1,
        },
        interests: {
            type: Schema.Types.Mixed,
            default: [],
        },
        storage: {
            type: String,
            default: null,
        },
        privacy: {
            email: {
                type: String,
                enum: settings.privacy_types,
                default: 'private',
            },
            name: {
                first: {
                    type: String,
                    enum: settings.privacy_types,
                    default: 'public',
                },
                last: {
                    type: String,
                    enum: settings.privacy_types,
                    default: 'private',
                },
            },
            bio: {
                type: String,
                enum: settings.privacy_types,
                default: 'private',
            },
        },
        recoveryCode: {
            type: String,
            trim: true,
            default: '',
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
    { collection: 'users' },
);

/*
    Virtuals
*/


/*
    Generate token
*/
ProfileSchema.pre('validate',function pre_validate(next) {
    if ( typeof this.token === 'undefined' || this.token === null || this.token === '' ) {
        this.token = md5(uuidv4());
    }
    this.storage = path.resolve(this.api.storage + '/' + this.token);
    next();
});

/*
    Generate files
*/

ProfileSchema.pre('save', function pre_save_create_folder(next) {

    if ( !fs.existsSync(this.storage)) {
        fs.mkdirSync(this.storage);
    }

    next();
});

/*
    Methods
*/

ProfileSchema.method('getImageByName', async function ( image_name) {
    const image = await mongoose.model('Image').findOne({deleted: false, api: this.api, name: image_name, owner: this});

    return !!image ? image : null;
});

ProfileSchema.method('parseData', async function ( mode = 'private') {
    const data = {
        username: this.username,
        name: {},
        images:[],
    };

    if (mode === 'private' || this.privacy.email === 'public') {
        data.email = this.email;
    }

    if (mode === 'private' || this.privacy.name.first === 'public') {
        data.name.first = this.name.first;
    }

    if (mode === 'private' || this.privacy.name.last === 'public') {
        data.name.last = this.name.last;
    }

    if (mode === 'private' || this.privacy.bio === 'public') {
        data.bio = this.bio;
    }

    if (mode === 'private') {
        data.token = this.token;
    }

    const privacy_where = (mode === 'private') ? {} : { 'privacy': 'public'};
    const images = await mongoose.model('Image').find({'_id': {'$in': this.images}, deleted: false, ...privacy_where });//.populate('owner');
    data.images = images.map( image => ({
        url: image.url,
        custom_data: image.custom_data,
    }));


    return data;
});


// require plugins
ProfileSchema.plugin(timestamps); // automatically adds createdAt and updatedAt timestamps
ProfileSchema.plugin(mongooseStringQuery); // enables query capabilities (e.g. ?foo=bar)

ProfileSchema.index({ email: 1, api: 1 }); // compound index on email + username
ProfileSchema.index({ username: 2, api: 2 }); // compound index on email + username

module.exports = exports = mongoose.model('Profile', ProfileSchema); // export model for use
// import npm modules
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const timestamps = require('mongoose-timestamp');
const mongooseStringQuery = require('mongoose-string-query');

const path = require('path');
const fs = require('fs');
const uuidv4 = require('uuid/v4');
const md5 = require('md5');

const privacy_types = ['private','public'];
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
            fd: {
                type: String,
                required: true,
            }
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
        privacy: {
            email: {
                type: String,
                enum: privacy_types,
                default: 'private',
            },
            name: {
                first: {
                    type: String,
                    enum: privacy_types,
                    default: 'public',
                },
                last: {
                    type: String,
                    enum: privacy_types,
                    default: 'private',
                },
            },
            bio: {
                type: String,
                enum: privacy_types,
                default: 'private',
            },
            images: [{
                type: String,
                enum: privacy_types,
                default: 'private',
            }]

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

ProfileSchema.virtual('storage')
    .get(function () {
        return path.resolve(this.api.storage + '/' + this.token);
    });


/*
    Generate token
*/
ProfileSchema.pre('validate',function pre_validate(next) {
    if ( typeof this.token === 'undefined' || this.token === null || this.token === '' ) {
        this.token = md5(uuidv4());
    }
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

ProfileSchema.method('getImageUrl', function (index) {
    return '/profile/' + this.token + '/img/'+index;
});

ProfileSchema.method('parseData',function ( mode = 'private') {
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

    this.images.forEach((image,index) => {
        if (mode === 'private' || this.privacy.images[i] === 'public' ) {
            data.images.push({
                url: this.getImageUrl(index)
            });
        }
    });


    return data;
});


// require plugins
ProfileSchema.plugin(timestamps); // automatically adds createdAt and updatedAt timestamps
ProfileSchema.plugin(mongooseStringQuery); // enables query capabilities (e.g. ?foo=bar)

ProfileSchema.index({ email: 1, api: 1 }); // compound index on email + username
ProfileSchema.index({ username: 2, api: 2 }); // compound index on email + username

module.exports = exports = mongoose.model('Profile', ProfileSchema); // export model for use
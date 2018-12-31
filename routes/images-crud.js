const express = require('express');
const router = express.Router();

const db = require('../database');
const {Profile, Api, Image} = require('../models');
const settings = require('../settings');

const fs = require('fs');
const path = require('path');
const md5 = require('md5');
const uuidv4 = require('uuid/v4');

const {decorate, require_some_auth, require_image_name_exists} = require('./decorators');

/*
    1. Validate parameters
 */


router.use('/profiles/:username',
    decorate(
        require_some_auth,
        async function (req, res, next) {
            const profile = await Profile.findOne({api: req.api, deleted: false, username: req.params.username}).populate('api').populate('images');

            if (!!profile) {
                req.target_profile = profile;
                return next();
            }

            req.response.addError(1, `No user with username '${req.params.username}'.`);
            req.response.send(res);
        }
    )
);


/*
    2. CRUD
 */
/**
 * @apiDefine Images
 * @apiHeader (Headers) {String} Api-token Required if no Authorization Bearer provided.
 * @apiHeader (Headers) {String} Authorization Bearer Auth-token. Required if no Api-token provided.
 *
 */

/**
 * @apiUse Images
 *
 * @api {get} /profiles/:username/img/:image_name Get profiles image
 * @apiName Get profile image
 * @apiDescription Get profile image
 * @apiGroup Images
 *
 */


router.get('/profiles/:username/img/', async function(req, res, next) {

    if (req.target_profile.images.length === 0) {
        return await res.sendFile(settings.profileImages.default.path);
    }

    res.redirect(req.target_profile.images[0].url);
});


router.get('/profiles/:username/img/:image_name', async function(req, res, next) {

    const image = await req.target_profile.getImageByName(req.params.image_name);
    if (image === null) {
        await res.sendFile(settings.profileImages.default.path);
    } else {
        await res.sendFile(image.fd);
    }

    //next();
});

/**
 * @apiUse Images
 *
 * @api {post} /profiles/:username/img/ Post profile image
 * @apiName Post profile image
 * @apiDescription Post profile image. Returns profile data.
 *
 * Any file in a form field with an accepted MIME type will be posted as image.
 * Furtheremore, any text form field with name `<image's form field name> + '_custom_data'` so that
 * it is a parsed JSON will be interpreted as image's custom data attached to it.
 *
 * In request example, two images will be posted. First one will have custom data
 * `{ "tags": [ "sunflower", "summer" ], "type": "main" }` attached to it.
 *
 * Second one will have attached, by default, `null` value as custom data.
 *
 * @apiGroup Images
 *
 * @apiParamExample {Form} Request example:
 * Form:
 *      Field: type = "file", name = "any_name_you_want", value = <Image data: name='sunflower.jpg', mime_type: 'image/jpg', ...>
 *      Field: type = "file", name = "any_name_you_want_secondary", value = <Image data: name='margarite.jpg', mime_type: 'image/jpg', ...>
 *      Field: type = "text", name = "any_name_you_want_custom_data", value = "{\"tags\":[\"sunflower\",\"summer\"],\"type\":\"main\"}"
 *
 *
 */


router.post('/profiles/:username/img', async function(req, res, next) {

    if ( req.me instanceof Api || req.me === req.target_profile) {

        const target_profile = req.target_profile;

        for (key in req.files) {
            const file = req.files[key];

            const acceptedMimeType = settings.profileImages.acceptedMimeTypes.findIndex( m => m === file.mimetype ) >= 0;
            if (acceptedMimeType) {

                let image_data = null;
                if ( (key + '_custom_data') in req.body) {
                    const image_data_string = req.body[key + '_custom_data'];
                    try {
                        image_data = JSON.parse(image_data_string);
                    } catch (e) {
                        image_data = null;
                    }
                }

                // creating image
                const image = await new Image({
                    owner: target_profile,
                    mimetype: file.mimetype,
                    original_name: file.name,
                    privacy: 'public',
                    custom_data: image_data,
                });

                await image.save((err,updated_image) => {
                    if (!!err) {
                        console.log(err);
                        req.response.addError(err.code, err.errmsg);
                    }
                });

                await Image.updateOne(image,{},(err,updated_image) => {
                    if (!!err) {
                        console.log(err);
                        req.response.addError(err.code, err.errmsg);
                    }
                });

                file.mv(image.fd, err => {
                    // TODO do something with errors
                    if (!!err) {
                        console.error(err);
                        req.response.addError(1,'Unknown error.');
                    }
                });

                target_profile.images.push(image);

            } else {
                req.response.addError(1,`File '${key}' has not an accepted MIME type.`);
            }

        }

        await Profile.updateOne({_id: target_profile._id},{images: target_profile.images, privacy: target_profile.privacy}, (err, profile) => {
            if (!!err) {
                req.response.addError(err.code, err.errmsg);
            }
        });

        const updated_target_profile = await Profile.findById(target_profile._id);

        req.response.send(res,await updated_target_profile.parseData());

    } else {
        req.response.addError(1,'Unauthorized.');
        req.response.send(res);
    }

    next();
});


/**
 * @apiUse Images
 *
 * @api {put} /profiles/:username/img/:image_name Put profile image
 * @apiName Put profile image
 * @apiDescription Put profile images. Replaces actual image for provided one. Returns profile data.
 *
 * Any file in a form field with an accepted MIME type will be put as image.
 * Furtheremore, any text form field with name `custom_data` so that
 * it is a parsed JSON will be interpreted as image's custom data attached to it.
 *
 * In request example 1, the target image will be replaced for the sended one. Furthermore, it's custom data will be replaced by
 * `{ "tags": [ "sunflower", "summer" ], "type": "main" }`.
 *
 *  In request example 2, no image will be replaced, but target image's custom data will be replaced by
 * `{ "tags": [ "sunflower", "summer" ], "type": "main" }`.
 *
 *
 * @apiGroup Images
 *
 * @apiParamExample {Form} Request example 1:
 * Form:
 *      Field: type = "file", name = "any_name_you_want", value = <Image data: name='sunflower.jpg', mime_type: 'image/jpg', ...>
 *      Field: type = "text", name = "custom_data", value = "{\"tags\":[\"sunflower\",\"summer\"],\"type\":\"main\"}"
 *
 * @apiParamExample {Form} Request example 2:
 * Form:
 *      Field: type = "text", name = "custom_data", value = "{\"tags\":[\"sunflower\",\"summer\"],\"type\":\"main\"}"
 */

router.put('/profiles/:username/img/:image_name',
    decorate(
        require_image_name_exists('image_name','target_image'),
        async function(req, res, next) {

            if ( req.me instanceof Api || req.me === req.target_profile) {

                const target_profile = req.target_profile;
                const target_image = req.target_image;

                // update image itself

                for (key in req.files) {
                    const file = req.files[key];

                    const acceptedMimeType = settings.profileImages.acceptedMimeTypes.findIndex( m => m === file.mimetype ) >= 0;
                    if (acceptedMimeType) {

                        target_image.mimetype = file.mimetype;
                        target_image.setNewName();
                        target_image.original_name = file.name;
                        await target_image.save();

                        await Image.updateOne(target_image, {},(err,updated_image) => {
                            if (!!err) {
                                console.log(err);
                                req.response.addError(err.code, err.errmsg);
                            }
                        });

                        file.mv(target_image.fd, err => {
                            // TODO do something with errors
                            if (!!err) {
                                console.error(err);
                                req.response.addError(1,'Unknown error.');
                            }
                        });

                    } else {
                        req.response.addError(1,`File '${key}' has not an accepted MIME type.`);
                    }

                }

                // update image custom data
                if ('custom_data' in req.body) {
                    const image_data_string = req.body['custom_data'];
                    try {
                        const custom_data = JSON.parse(image_data_string);
                        await Image.updateOne(target_image, {custom_data},(err,updated_image) => {
                            if (!!err) {
                                console.error(err);
                                req.response.addError(err.code, err.errmsg);
                            }
                        });
                    } catch (e) {
                        req.response.addError(2, 'Custom data attached to image cannot be parsed as a JSON.');
                    }
                }

                // update profile
                await Profile.updateOne({_id: target_profile._id},{images: target_profile.images, privacy: target_profile.privacy}, (err, profile) => {
                    if (!!err) {
                        console.error(err);
                        req.response.addError(err.code, err.errmsg);
                    }
                });

                const updated_target_profile = await Profile.findById(target_profile._id);

                req.response.send(res,await updated_target_profile.parseData());

            } else {
                req.response.addError(1,'Unauthorized.');
                req.response.send(res);
            }

            next();
        },
    )
);



/**
 * @apiUse Images
 *
 * @api {delete} /profiles/:username/img/:image_name Delete profile image
 * @apiName Delete profile image
 * @apiDescription Delete profile image. Returns profile data.
 * @apiGroup Images
 *
 */

router.delete('/profiles/:username/img/:image_name',
    decorate(
        require_image_name_exists('image_name','target_image'),
        async function (req, res, next) {

            if ( req.me instanceof Api || req.me === req.target_profile) {

                const target_profile = req.target_profile;
                const target_image = req.target_image;

                await target_image.unlinkFromUser();
                const updated_target_profile = await Profile.findById(target_profile._id);

                req.response.send(res,updated_target_profile);

            } else {
                req.response.addError(1,'Unauthorized.');
                req.response.send(res);
            }


            next();
        },
    ),
);

module.exports = router;
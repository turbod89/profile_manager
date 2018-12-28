const express = require('express');
const router = express.Router();

const db = require('../database');
const {Profile, Api} = require('../models');
const settings = require('../settings');

const fs = require('fs');
const path = require('path');
const md5 = require('md5');
const uuidv4 = require('uuid/v4');

const {decorate, require_some_auth} = require('./decorators');

/*
    1. Validate parameters
 */


router.use('/profiles/:username',
    decorate(
        require_some_auth,
        async function (req, res, next) {
            const profile = await Profile.findOne({api: req.api, deleted: false, username: req.params.username}).populate('api');

            if (!!profile) {
                req.target_profile = profile;
                return next();
            }

            req.response.addError(1, `No user with token '${req.params.username}'.`);
            req.response.send(res);
        }
    )
);


/*
    2. CRUD
 */
/**
 * @apiDefine Images
 * @apiHeader (Headers) {String} Api-token
 *
 */

/**
 * @apiUse Images
 *
 * @api {get} /profiles/:username/img/:index Get profiles image
 * @apiName Get profile image
 * @apiDescription Get profile image
 * @apiGroup Images
 *
 */


router.get('/profiles/:username/img/', async function(req, res, next) {

    res.redirect('/profiles/' + req.params.username + '/img/0');
});


router.get('/profiles/:username/img/:index', async function(req, res, next) {

    const image_index = req.params.index;
    console.log('here');
    if (image_index < 0 || image_index >= req.target_profile.images.length) {
        await res.sendFile(settings.profileImages.default.path);
    } else {
        console.log(req.target_profile.images[image_index]);
        await res.sendFile(req.target_profile.images[image_index].fd);
    }

    //next();
});

/**
 * @apiUse Images
 *
 * @api {post} /profiles/:username/img/ Post profile image
 * @apiName Post profile image
 * @apiDescription Post profile image
 * @apiGroup Images
 *
 */


router.post('/profiles/:username/img', async function(req, res, next) {

    if ( req.me instanceof Api || req.me === req.target_profile) {

        const target_profile = req.target_profile;

        for (key in req.files) {
            const file = req.files[key];

            if (settings.profileImages.acceptedMimeTypes.findIndex( m => m === file.mimetype ) >= 0) {

                const extension = (function (m) {
                    if (m === 'image/jpeg') {
                        return 'jpg';
                    } else if (m === 'image/png') {
                        return 'png';
                    }

                    return null;
                })(file.mimetype);


                const filename = md5(uuidv4())+'.'+extension;
                const file_path = path.resolve(target_profile.storage + '/' +filename);

                file.mv(file_path, err => {
                    // TODO do some thing with errors
                    console.error(err);
                });

                target_profile.images.push({fd: file_path});
                target_profile.privacy.images.push('public');

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
        req.response.send(res,updated_target_profile.parseData());

    } else {
        req.response.addError(1,'Unauthorized.');
        req.response.send(res);
    }

    next();
});


module.exports = router;
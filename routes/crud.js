const express = require('express');
const router = express.Router();

const db = require('../database');
const {Profile, Api} = require('../models');

const {decorate, require_api_auth} = require('./decorators');

/**
 * @apiDefine Profiles
 * @apiHeader (Headers) {String} Api-token
 *
 */

/**
 * @apiUse Profiles
 *
 * @api {get} /profiles Get all profiles
 * @apiName Get profiles
 * @apiDescription Get all profiles
 * @apiGroup Profiles
 *
 */

router.get('/profiles',
    decorate(
        require_api_auth,
        async function(req, res, next) {
            const data = await Profile.find({api: req.me, deleted: false})
                .then ( data => data.map(profile => profile.parseData()))
                .catch( (err) => {
                    if (!!err) {
                        req.response.addError(err.code,err.errmsg);
                    }

                })
            ;

            req.response.send(res,data);

            next();
        }
    )
);

/**
 * @apiUse Profiles
 *
 * @api {post} /profiles Creates a new profile
 * @apiName Post profiles
 * @apiDescription Creates a new profile
 * @apiGroup Profiles
 *
 * @apiParamExample {json} Request example:
 *
 * {
 *      "username": "test_user",
 *      "email": "test@example.com",
 *      "name": {
 *          "first": "John",
 *          "last": "Doe"
 *      },
 *      "bio": "Little biography"
 * }
 *
 */

router.post('/profiles',
    decorate(
        require_api_auth,
        async function(req, res, next) {

            const profile_data = req.body;
            profile_data.api = req.me;

            // check obligatory fields TODO

            // check availavility
            const similar_users = await Profile.find({ $or: [
                    {api: profile_data.api, deleted: false, email: profile_data.email},
                    {api: profile_data.api, deleted: false, username: profile_data.username},
                ],
            });

            if (similar_users.length > 0) {
                req.response.addError(1,'Profilename or email not available.');
                req.response.send(res);
                return next();
            }


            // creating user
            const profile = new Profile(profile_data);
            await profile.save(err => {
                if (!!err) {
                    req.response.addError(err.code, err.errmsg);
                }
            });

            req.response.send(res,profile.parseData());
            return next();
        }
    )
);


/**
 * @apiUse Profiles
 *
 * @api {put} /profiles Updates a profile
 * @apiName Put profiles
 * @apiDescription Updates a profile. Profile is getted by username, email or token.
 * If token is provided, fields email and token will be updated if provided.
 * Else, if username is provided, field email will be updated if provided.
 *
 * Response will contain profile updated info.
 *
 * @apiGroup Profiles
 *
 * @apiParamExample {json} Request example:
 *
 * {
 *      "username": "test_user",
 *      "email": "test@example.com",
 *      "name": {
 *          "first": "John",
 *          "last": "Doe"
 *      },
 *      "bio": "Little biography"
 * }
 *
 */

router.put('/profiles',
    require_api_auth(
        async function(req, res, next) {

            const profile_data = req.body;
            profile_data.api = req.me;

            const profile = await (async function () {

                if ('token' in profile_data) {
                    const profile = await Profile.findOne({api: profile_data.api, deleted: false, token: profile_data.token});
                    delete profile_data.token;
                    return profile;
                } else if ('username' in profile_data) {
                    const profile = await Profile.findOne({api: profile_data.api, deleted: false, username: profile_data.username});
                    delete profile_data.username;
                    return profile;
                } else if ('email' in profile_data) {
                    const profile = await Profile.findOne({api: profile_data.api, deleted: false, email: profile_data.email});
                    delete profile_data.email;
                    return profile;
                }

                return null;

            })();

            if (profile === null) {
                req.response.addError(1,'Profile not found');
                req.response.send(res);
                return next();
            }

            await Profile.findOneAndUpdate({_id: profile._id},profile_data, (err, profile) => {
                if (!!err) {
                    req.response.addError(err.code, err.errmsg);
                }
            })
            ;

            const updatedProfile = await Profile.findById(profile._id);

            req.response.send(res,updatedProfile.parseData());
            return next();
        }
    )
);


/**
 * @apiUse Profiles
 *
 * @api {delete} /profiles Deletes a profile
 * @apiName Delete profiles
 * @apiDescription Deletes a profile. Profile is getted by username, email or token.
 *
 * @apiGroup Profiles
 *
 * @apiParamExample {json} Request example:
 *
 * {
 *      "username": "test_user",
 * }
 *
 */

router.delete('/profiles',
    require_api_auth(
        async function(req, res, next) {

            const profile_data = req.body;
            profile_data.api = req.me;

            const profile = await (async function () {

                if ('token' in profile_data) {
                    const profile = await Profile.findOne({api: profile_data.api, deleted: false, token: profile_data.token});
                    delete profile_data.token;
                    return profile;
                } else if ('username' in profile_data) {
                    const profile = await Profile.findOne({api: profile_data.api, deleted: false, username: profile_data.username});
                    delete profile_data.username;
                    return profile;
                } else if ('email' in profile_data) {
                    const profile = await Profile.findOne({api: profile_data.api, deleted: false, email: profile_data.email});
                    delete profile_data.email;
                    return profile;
                }

                return null;

            })();

            if (profile === null) {
                req.response.addError(1,'Profile not found');
                req.response.send(res);
                return next();
            }

            await Profile.findOneAndUpdate({_id: profile._id},{deleted: true, deletedAt: new Date()}, (err, profile) => {
                if (!!err) {
                    req.response.addError(err.code, err.errmsg);
                }
            })
            ;

            req.response.send(res);
            return next();
        }
    )
);


module.exports = router;

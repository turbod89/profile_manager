const express = require('express');
const router = express.Router();

const db = require('../database');
const {Profile, Api} = require('../models');

const {decorate, require_api_auth, require_some_auth} = require('./decorators');

/**
 * @apiDefine Profiles
 *
 *
 */

/**
 * @apiUse Profiles
 *
 * @api {get} /profiles Get all profiles
 * @apiName Get profiles
 * @apiDescription Get all profiles.
 * @apiGroup Profiles
 * @apiHeader (Headers) {String} Api-token
 *
 */

router.get('/profiles',
    decorate(
        require_api_auth,
        async function(req, res, next) {
            const data = await Profile.find({api: req.api, deleted: false})
                .then ( data => Promise.all(data.map( profile => profile.parseData())) )
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
 * @api {get} /profiles/:username Get single profile
 * @apiName Get single profile
 * @apiDescription Get single profile.
 * @apiGroup Profiles
 * @apiHeader (Headers) {String} Api-token Required if no Authorization Bearer provided.
 * @apiHeader (Headers) {String} Authorization Bearer Auth-token. Required if no Api-token provided.
 *
 */


router.get('/profiles/:username',
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
        },
    )
);


router.get('/profiles/:username',
    decorate(
        async function(req, res, next) {
            const profile = req.target_profile;
            const mode = (req.me instanceof Api) ? 'private' : 'public';
            const profile_data = await profile.parseData(mode);

            req.response.send(res,profile_data);
            next();
        },
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
 * @apiHeader (Headers) {String} Api-token
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
            profile_data.api = req.api;

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

            req.response.send(res,await profile.parseData());
            return next();
        }
    )
);


/**
 * @apiUse Profiles
 *
 * @api {put} /profiles Updates a profile
 * @apiName Put profiles
 * @apiDescription Updates a profile. Profile is getted by username, email, token or profile authentication.
 * If token is provided, fields email and token will be updated if provided.
 * Else, if username is provided, field email will be updated if provided.
 * Furthermore, if request is done through Authorization header, none of above is required. The authenticated profile will be used.
 *
 * Response will contain profile updated info.
 *
 *
 * @apiGroup Profiles
 *
 * @apiHeader (Headers) {String} Api-token Required if no Authorization Bearer provided.
 * @apiHeader (Headers) {String} Authorization Bearer Auth-token. Required if no Api-token provided.
 *
 * @apiParamExample {json} Request example 1:
 *
 * Through api-token header.
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
 * @apiParamExample {json} Request example 2:
 *
 * Through Authorization Bearer header
 *
 * {
 *      "bio": "Little biography"
 * }
 *
 * @apiParamExample {json} Request example 3:
 *
 * Through Authorization Bearer header
 *
 * {
 *      "token": <token>,
 *      "email": "new_test_email@example.com",
 *      "bio": "Little biography"
 * }
 *
 */

router.put('/profiles',
    decorate(
        require_some_auth,
        async function(req, res, next) {

            const profile_data = req.body;
            profile_data.api = req.api;

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
                } else if (req.me instanceof Profile) {
                    const profile = req.me;
                    return profile;
                }

                return null;

            })();

            if (profile === null) {
                req.response.addError(1,'Profile not found');
                req.response.send(res);
                return next();
            }

            if ( req.me instanceof Api || req.me === profile) {

                await Profile.findOneAndUpdate({_id: profile._id}, profile_data, (err, profile) => {
                    if (!!err) {
                        req.response.addError(err.code, err.errmsg);
                    }
                })
                ;

                const updatedProfile = await Profile.findById(profile._id);

                req.response.send(res, await updatedProfile.parseData());
                return next();
            }
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
 * @apiHeader (Headers) {String} Api-token
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
            profile_data.api = req.api;

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

const {Api, Profile} = require('../../models');

module.exports = function require_api_auth (f) {
    return async function (req,res,next) {
        if ( !!(req.get('api-token')) ) {
            const token = req.get('api-token');
            const api = await Api.findOne({token});
            if (!!api && 'token' in api) {
                req.me = api;
                req.api = api;
                return await Promise.resolve(f(req,res,next));
            }

        }

        req.response.addError(1, 'Unauthorized.');
        req.response.send(res);

    }
};

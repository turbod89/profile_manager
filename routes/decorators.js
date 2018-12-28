const {Api, Profile} = require('../models');

const decorate = function () {
    if (arguments.length <= 0) {
        return () => {};
    }

    let result = arguments[arguments.length -1];

    for (let i = arguments.length -2; i >= 0;i--) {
        result = arguments[i](result);
    }

    return result;
};

const require_api_auth = function require_api_auth (f) {
  return async function (req,res,next) {
      if ( !!(req.get('api-token')) ) {
          const token = req.get('api-token');
          const api = await Api.findOne({token});
          if (!!api && 'token' in api) {
              req.me = api;
              return await Promise.resolve(f(req,res,next));
          }

      }

      req.response.addError(1, 'Unauthorized.');
      req.response.send(res);

  }
};


const require_user_auth = function require_api_auth (f) {
    return async function (req,res,next) {
        if ( !!(req.get('Authorization')) ) {
            const auth_header = req.get('Authorization');
            const matchs = auth_header.match(/^Bearer ([^ ]+)/i);
            if (matchs.length >= 2) {
                const token = matchs[1];
                const profile = await Profile.findOne({token}).populate('api');
                if (!!profile && 'token' in profile) {
                    req.me = profile;
                    req.api = profile.api;
                    return await Promise.resolve(f(req,res,next));
                }
            }

        }

        req.response.addError(1, 'Unauthorized.');
        req.response.send(res);

    }
};

const require_some_auth = function require_api_auth (f) {
    return async function (req,res,next) {
        if ( !!(req.get('api-token')) ) {
            const token = req.get('api-token');
            const api = await Api.findOne({token});
            if (!!api && 'token' in api) {
                req.me = api;
                req.api = api;
                return await Promise.resolve(f(req,res,next));
            }

        } else if ( !!(req.get('Authorization')) ) {
            const auth_header = req.get('Authorization');
            const matchs = auth_header.match(/^Bearer ([^ ]+)/i);
            if (matchs.length >= 2) {
                const token = matchs[1];
                const profile = await Profile.findOne({token}).populate('api');
                if (!!profile && 'token' in profile) {
                    req.me = profile;
                    req.api = profile.api;
                    return await Promise.resolve(f(req,res,next));
                }
            }

        }

        req.response.addError(1, 'Unauthorized.');
        req.response.send(res);

    }
};


module.exports = {
    decorate,
    require_api_auth,
    require_user_auth,
    require_some_auth,
};
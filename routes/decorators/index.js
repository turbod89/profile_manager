const require_some_auth = require('./require_some_auth');
const require_api_auth = require('./require_api_auth');
const require_profile_auth = require('./require_profile_auth');
const require_image_name_exists = require('./require_image_name_exists');

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

module.exports = {
    decorate,
    require_api_auth,
    require_profile_auth,
    require_some_auth,
    require_image_name_exists,
};
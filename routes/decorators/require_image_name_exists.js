const {Api, Profile, Image} = require('../../models');

module.exports = (image_name_param, target_image_name = 'target_image') => function require_image_name_exists (f) {
    return async function (req,res,next) {

        if ( !(image_name_param in req.params) ) {
            req.response.addError(1, `Expected parameter '${image_name_param}'.`);
            req.response.send(res);
            return;
        }

        const image = await Image.findOne({api: req.api, deleted: false, name: req.params[image_name_param]}).populate('owner');

        if (!image) {
            req.response.addError(1, `Image with name '${req.params[image_name_param]}' does not exists.`);
            req.response.send(res);
            return
        }

        req[target_image_name] = image;
        return await Promise.resolve(f(req,res,next));

    }
};

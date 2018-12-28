const express = require('express');
const router = express.Router();
const {Api} = require('../models');

const StandardResponse = require('./standard-response');


/* GET home page. */


/*
  1. Create response object
 */

router.use(function responseObject (req,res,next) {
    req.response = new StandardResponse();
    next();
});

/*
    2. Import crud
*/

const crudRouter = require('./crud');
router.use(crudRouter);

/*
    3. Import images
 */
const imagesRouter = require('./images');
router.use(imagesRouter);


module.exports = router;

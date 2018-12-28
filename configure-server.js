const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const express = require('express');
const logger = require('morgan');
const fileUpload = require('express-fileupload');

exports = module.exports = function (app) {

    const SESSION_ID_NAME = 'SESSION_ID';

    app.use(logger('dev'));
    app.use(express.json());

    app.use(express.urlencoded({ extended: false }));

    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.use(cookieParser());
    app.use(fileUpload());

    /*
        1.  Manage sessions
    */

    app.use( function sessionManager (req, res, next) {
        if ( !(SESSION_ID_NAME in req.cookies) ) {

            req.cookies[SESSION_ID_NAME] = Math.floor(256*256*256*256*Math.random()).toString(16);
            req.session = req.cookies[SESSION_ID_NAME];
            res.cookie(SESSION_ID_NAME, req.cookies[SESSION_ID_NAME], {maxAge: 10800});
        }

        next();
    });

    /*
        2.  Headers setup
    */

    app.use( function setHeaders (req, res, next) {

        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        res.header("Access-Control-Allow-Methods", "GET, POST, HEAD, DELETE");


        next();

    });

    /*
        3. Just log requests
    */

    app.use ( function logRequest (req, res, next) {
        /*
        console.log('Cookies: ', req.cookies);
        console.log('Request params: ', req.params);
        console.log('Request body: ', req.body);
        */
        next();
    });
};
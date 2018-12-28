
// const {Api} = require('./models');
//const test_api = new Api({name:'Test api', token:'d3e76da78c846375c7722438a9f69b06'});
//test_api.save().then(err =>console.log(err));

/*
    1.  Configure server
 */

const express = require('express');
const configure_server = require('./configure-server');
const app = express();
configure_server(app);


/*
    2.  Setup Router
 */

//app.use(express.static(path.join(__dirname, 'public')));


const router = require('./routes');
app.use('/', router);

/*
    3.  Export server
 */

module.exports = app;

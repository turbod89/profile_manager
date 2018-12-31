const path = require('path');
const fs = require('fs');

module.exports = {
  mongodb: {
      connections: {
          "local": {
              "user": "user",
              "password": "password",
              "database": "db_name",
              "port": 27017,
              "host": "localhost",
          },
      },
      use: "local",
  },
    storage: {
      path: path.resolve(__dirname + "/../data"),
    },
    profileImages: {
        default: {
          path: path.resolve(__dirname + '/../public/images/profile_128x128.png'),
        },
        acceptedMimeTypes: ['image/jpeg','image/png'],
    },
    privacy_types: ['private','public'],
};
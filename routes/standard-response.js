const StandardResponseFactory = function StandardResponseFactory() {

    const StandardResponse = function StandardResponse() {

        const _errors = [];


        Object.defineProperties(this, {
            "errors": {
                "enumerable": true,
                "configurable": false,
                "get":  () => _errors,
            },
            "data": {
                "enumerable": true,
                "configurable": false,
                "writable": true,
                "value": null,
            },
        });


    };

    Object.defineProperties(StandardResponse.prototype, {
       "addError": {
           "enumerable": true,
           "configurable": false,
           "writable": false,
           "value": function (code=1, message='Unknown Error', data = null) {
               this.errors.push({code,message,data});
           },
       },
        "send": {
           "enumerable": true,
            "configurable": false,
            "writable":false,
            "value": function (res) {

               //res.header('Content-Type', 'application/json');
                if (arguments.length >= 2) {
                    this.data = arguments[1];
                }

                res.json({data: this.data, errors: this.errors});
            }
        },
    });

    return StandardResponse;
};

module.exports = StandardResponseFactory();
// Dependencies
const _data = require("./data");
const helpers = require("./helpers");
const config = require("../configuration/config");

// Handlers object
var handlers = {};

// Handler for '/users' - public route
handlers.users = function(data,callback){
    var acceptableMethods = ['post','get','put','delete'];
    if (acceptableMethods.indexOf(data.method) > -1){
        handlers._users[data.method](data,callback);
    }
    else {
        callback(405);
    };
};
// Handler for '/tokens' - public route
handlers.tokens = function(data,callback){
    var acceptableMethods = ['post','get','put','delete'];
    if (acceptableMethods.indexOf(data.method) > -1){
        handlers._tokens[data.method](data,callback);
    }
    else{
        callback(405);
    };
};

// Handler for '/checks' - public route
handlers.checks = function(data,callback){
  var acceptableMethods = ['post','get','put','delete'];
  if (acceptableMethods.indexOf(data.method) > -1){
    handlers._checks[data.method](data,callback);
  }
  else {
    callback(405);
  };
};

// Handler for '/users' - private route
handlers._users = {};

// Required Data: firstName, lastName, Phone, Password, TOSagreement

handlers._users.post = function(data,callback){
    /*
    *   Required Data: firstName, lastName, phone, password, TOSagreement
    *   Optional Data: None
    */

    // Basic Sanity Check for
    var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    var TOSagreement = typeof(data.payload.TOSagreement) == 'boolean' && data.payload.TOSagreement == true ? true : false;

    if (firstName && lastName && phone && password && TOSagreement){
        // Make sure the User doesn't already exist
        // Using the '*.read() function from ./data.js
        _data.read('users',phone,function(err,data){
            if (err){
                // If the a User with the specified phone number doesnot exist, the _data.read() will call an error
                // which this control-statement catches and then hashes it by help of 'helpers.js' dependency

                var hashedPass = helpers.hash(password);

                if (hashedPass){
                    // If Password is Hashed Successfully, then store it into 'userObject' and create a new
                    // file using the '*.create()' function from data.js library
                    var userObject = {
                        'firstName': firstName,
                        'lastName': lastName,
                        'phone': phone,
                        'hashedPass': hashedPass,
                        'TOSagreement': true,
                    };

                    _data.create('users',phone,userObject,function(err){
                        if (!err){
                            callback(200);
                        }
                        else {
                            console.log(err);
                            callback(500,{'Error':'Couldn\'t create a new user'});
                        };
                    });
                }
                else {
                    callback(500,{'Error':'Couldn\'t hash user\'s password'});
                };
            }
            else {
                // User with specified phone number already exists
                callback(400,{"Error":"User with that phone number already exists"});
            }
        });
    }
    else {
        callback(400,{"Error":"Missing Required Fields"});
    };
};
handlers._users.get = function(data,callback){
    /*
    *   Required Data: Phone (only through Query String, not payload; Payloads aren't accepted in GET and DELETE methods)
    *   Optional Data: None
    */

    // Check the Phone Number
    var phone = typeof(data.query.phone) == 'string' && data.query.phone.trim().length == 10 ? data.query.phone.trim() : false;

    // If Phone number exists, then read is using '*.read()' function, else callback an error with a statusCode 400
    if (phone){
        /*
        *   Only let an Authenticated User access there Information by taking the Token from the User and verifying it.
        */
        // Get the token from the Header
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        // Verify the Token
        handlers._tokens.verifyToken(token,phone,function(TokenisValid){
            if(TokenisValid){

                // If the token is valid (if it exists) then continue on
                _data.read('users',phone,function(err,data){

                    // If there is No error and data got while reading, then delete hashedPass and callback 200 and return the data
                    // else callback a 404

                    if (!err && data){
                        // Remove the Hashed Password from User Object before returning it to requester

                        delete data.hashedPass;
                        callback(200,data);
                    }
                    else{
                        callback(404);
                    }
                });
            }
            else{
                callback(403,{'Error':'Missing required token in header or token is invalid'})
            }
        });
    }
    else {
        callback(400,{"Error":"Phone number not provided"});
    }

};


handlers._users.put = function(data,callback){
    /*
    *  Required Data: Phone
    *  Optional Data: firstName, lastName, Password (atleast one of the Optional data must be specified along with required Phone Number)
    */

    // Check for Required Fields
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;

    // Check for Optional Fields
    var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    // If Phone number is provided, then continue, else error out with statusCode 400
    if(phone){

        // If anyone of firstName, lastName or password is provided then continue, else error-out with statusCode 400
        if(firstName || lastName || password){
            // Get the Token and check if it is valid
            var token = typeof(data.headers.token) == 'string' ? data.header.token : false;
            //Verify the Token and
            handlers._tokens.verifyToken(token,phone,function(TokenisValid){
                if (TokenisValid){
                    // Read the data from the disk/database
                    _data.read('users',phone,function(err,userData){
                        if (firstName){
                            userData.firstName = firstName;
                        }
                        if (lastName){
                            userData.lastName = lastName;
                        }
                        if (password){
                            userData.hashedPass = helpers.hash(password);
                        }

                        // Update the new userData to the Disk
                        _data.update('users',phone,userData,function(err){
                            if (!err){
                                callback(200);
                            }
                            else {
                                console.log(err);
                                callback(500,{'Error':'Couldnot Update UserData'});
                            }
                        });
                    });
                }
                else{
                    callback(403,{'Error':'Missing required token in header or token is invalid'});
                }
            });
        }
        else {
            callback(400,{'Error':'You should provide atleast 1 Optional Field'});
        }
    }
    else{
        callback(400,{'Error':'Missing Required Fields'});
    }
};
handlers._users.delete = function(data,callback){
    /*
    *   Required Data: Phone (Only through Query String, since GET and DELETE methods don't expect Payload)
    *   Optional Data: None
    */

    // Check if the Phone number is valid
    var phone = typeof(data.query.phone) == 'string' && data.query.phone.trim().length == 10 ? data.query.phone.trim() : false;

    // If Phone number is valid, read the data with '*.read()', else callback a 400 statusCode
    if (phone){

        // Get the Token from the Headers and check it's validity
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        handlers._tokens.verifyToken(token,phone,function(TokenisValid){
            if(TokenisValid){
                // If there is no error reading data and data is returned, delete the data using the '*.delete()' method
                _data.read('users',phone,function(err,data){
                    if (!err && data){
                        _data.delete('users',phone,function(err){
                            // If there is no error, callback a statusCode 200, else callback a statusCode 500 (Internal error);
                            if (!err){
                                callback(200);
                            }
                            else{
                                callback(500,{'Error':'Couldnot delete User'});
                            }
                        });
                    }
                    else{
                        callback(404,{'Error':'Couldnot find the specified User'});
                    }
                });
            }
            else{
                callback(403,{'Error':'Missing required token in header or token is invalid'});
            }
        });
    }
    else {
        callback(400,{"Error":"Phone number not provided"});
    }
};

// Container for token objects
handlers._tokens = {};

// Handlers for '/tokens' - private route methods
handlers._tokens.post = function(data,callback){
    /*
    *   Required Data: phone, password
    *   Optional Data: None
    */

    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    if (phone && password){
        // Lookup the user in the database based on the phone number
        _data.read('users',phone,function(err,data){
            if (!err){
                // Hash the sent password, and compare it to the password stored in the user files
                var hashedPassword = helpers.hash(password);
                if (hashedPassword == data.hashedPass){

                    // If both passwords match, create a token with a random name with expiration in 1 hour

                    var tokenId = helpers.createRandomString(20);
                    var expires = Date.now() * 1000 * 60 * 60;

                    var tokenObject = {
                        'id': tokenId,
                        'phone': phone,
                        'expires': expires
                    };

                    // Store the Token in disk
                    _data.create('tokens',tokenId,tokenObject,function(err){
                        if (!err){
                            callback(200,tokenObject);
                        }
                        else {
                            callback(400,{'Error':'Couldnot create new token'});
                        }
                    })
                }
                else{
                    callback(400,{'Error':'Couldnot find the Specified User\'s stored password'});
                }

            }
            else{
                callback(400,{'Error':'Couldnot find the specified user'});
            }
        })
    }
    else{
        callback(400,{'Error':'Missing Required Fields'});
    }
};

handlers._tokens.get = function(data,callback){
    /*
    *   Required Data: id
    *   Optional Data: None
    */
    var id = typeof(data.query.id) == 'string' && data.query.id.trim().length == 20 ? data.query.id.trim() : false;
    if (id){
        // Lookup the token in 'tokens' directory
        _data.read('tokens',id,function(err,tokenData){
            if(!err && data){
                callback(200,tokenData);
            }
            else {
                callback(404);
            };
        });
    }
    else{
        callback(400,{'Error':'Missing required Fields'});
    }

};

handlers._tokens.put = function(data,callback){
    /*
    *   Required Data: id, extend(bool)
    *   Optional Data: None
    */
    var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
    var extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;

    if (id && extend){
        // Lookup the specific token using the id
        _data.read('tokens',id,function(err,tokenData){
            if (!err && tokenData){
                // Check to make sure the token hasn't already expired
                if(tokenData.expires > Date.now()){
                    // Set the expiration to an hour from now
                    tokenData.expires = Date.now() * 1000 * 60 * 60;

                    // Store new updates
                    _data.update('tokens',id,tokenData,function(err){
                        if (!err){
                            callback(200);
                        }
                        else{
                            callback(500,{'Error':'Couldnot update the token\'s expiration'});
                        }
                    })
                }
                else{
                    callback(400,{'Error':'The Token has already expired and cannot be extended'});
                }
            }
            else{
                callback(400,{'Error':'Specified Token doesnot exist'});
            }
        });
    }
    else{
        callback(400,{'Error':'Missing required fields are not valid'});
    }
};

handlers._tokens.delete = function(data,callback){
    /*
    *   Required Data: id
    *   Optional Data: none
    */
   var id = typeof(data.query.id) == 'string' && data.query.id.trim().length == 20 ? data.query.id.trim() : false;

   if (id){
       // Read the Data and if successfull, delete it
       _data.read('tokens',id,function(err,tokenData){
           if(!err && tokenData){
               // Delete the Token
               _data.delete('tokens',id,function(err){
                   if (!err){
                       callback(200); // Status code OK (200)
                   }
                   else{
                       callback(500,{'Error':'Couldnot delete the user, possibly an internal error'}); //Status Code INTERNAL ERROR (500)
                   }
               });
           }
           else{
               callback(404,{'Error':'Couldn\'t find the specified token'});
           }
       });
   }
   else{
       callback(400,{'Error':'Missing required id'});
   }
};

handlers._tokens.verifyToken = function(id,phone,callback){
    // Lookup for the Token
    _data.read('tokens',id,function(err,tokenData){
        // Check that the token is for the given user and has not expired yet
        if (!err && tokenData){
            if (tokenData.phone == phone && tokenData.expires > Date.now()){
                callback(true);
            }
            else{
                callback(false);
            };
        }
        else{
            callback(false);
        }
    });
};

// Handler for '/checks' - private route
handlers._checks = {};

handlers._checks.post = function(data,callback){
    /*
    *   Required Data: protocol, url, method, successCode, timeoutSeconds, token (in header)
    *   Optional Data: none
    */

    var protocol = typeof(data.payload.protocol) == 'string' && ['https','http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    var method = typeof(data.payload.method) == 'string' && ['post','get','put','delete'].indexOf(data.payload.method) > -1? data.payload.method : false;
    var successCode = typeof(data.payload.successCode) == 'object' && data.payload.successCode instanceof Array ? data.payload.successCode : false;
    var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds < 5 ? data.payload.timeoutSeconds : false;

    // Proceed if all the fields are valid
    if (protocol && url && method && successCode && timeoutSeconds){
        // Get the Token provided by the user in the header
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        
        if(token){
            // Lookup for the token provided
            _data.read('tokens',token,function(err,tokenData){
                if (!err && tokenData){
                    // Get the phone number from the tokenData
                    var userPhone = tokenData.phone;

                    // Lookup for the user from the phone number provided by the user
                    var userPhone = tokenData.phone;

                    _data.read('users',userPhone,function(err,userData){
                        if (!err && userData){
                            var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

                            // Verify the user has less than the number of max-checks
                            if (userChecks.length < config.maxChecks){
                                // Create a random id for checks
                                var checkId = helpers.createRandomString(20);

                                // Create an Object and store it as a file
                                var checkObject = {
                                    'id': checkId,
                                    'userPhone': userPhone,
                                    'protocol': protocol,
                                    'url': url,
                                    'method': method,
                                    'successCode': successCode,
                                    'timeoutSeconds': timeoutSeconds
                                };
                                
                                _data.create('checks',checkId,checkObject,function(err){
                                    if (!err){
                                        // Add the checkId to user's object
                                        userData.checks = userChecks;
                                        userData.checks.push(checkId);

                                        // Save the new user data
                                        _data.update('users',userPhone,userData,function(err){
                                            if (!err){
                                                callback(200,checkObject);
                                            }
                                            else{
                                                callback(500,{'Error':'Couldnot update the user with new check'});
                                            }
                                        })
                                    }
                                    else{
                                        callback(500,{'Error':'Couldnot create a new check'});
                                    }
                                })
                            }
                            else{
                                callback(400,{'Error':'Maximum Checks limit exceeded'});
                            }
                        }
                        else{
                            callback(403);
                        }
                    });
                }
                else{
                    callback(403);
                }
            });
        }
        else{
            callback(400,{'Error':'Please Provide a token'});
        }
    }
    else{
        callback(400,{'Error':'Invalid or Missing Inputs'});
    }
};

handlers._checks.get = function(data,callback){
    /*
    *   Required Data: id, token
    *   Optional Data: None
    */

    // Get the id
    var id = typeof(data.query.id) == 'string' && data.query.id.trim().length == 20 ? data.query.id.trim() : false;

    // Check the integrity of id
    if (id){
        // Read the Check Data
        _data.read("checks",id,function(err,checkData){
            if (!err && checkData){
                // Get the Token from the Headers
                var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

                // Verify the Token
                handlers._tokens.verifyToken(token,checkData.userPhone,function(tokenIsValid){
                    if (tokenIsValid){

                        // Return the checkData
                        callback(200,checkData);
                    }
                    else{
                        callback(403,{'Error':'Token is not Valid'});
                    }
                });
            }
            else{
                callback(404);
            }
        });
    }
    else{
        callback(400,{'Error':'Missing Required Data'});
    }

};

handlers._checks.put = function(data,callback){
    /*
    *   Required Data: id
    *   Optional Data: protocol, method, url, successCode, timeoutSeconds
    */ 

    // Get the id from payload
    var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;

    // Get the Optional Data
    var protocol = typeof(data.payload.protocol) == 'string' && ['https','http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    var method = typeof(data.payload.method) == 'string' && ['post','get','put','delete'].indexOf(data.payload.method) > -1? data.payload.method : false;
    var successCode = typeof(data.payload.successCode) == 'object' && data.payload.successCode instanceof Array ? data.payload.successCode : false;
    var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds < 5 ? data.payload.timeoutSeconds : false;

    if(id){
        if (protocol || url || method || successCode || timeoutSeconds){
            // Check the id
            _data.read('checks',id,function(err, checkData){
                if (!err && checkData){
                    
                    // Get the token from headers
                    var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
                    
                    // Verify the token
                    handlers._tokens.verifyToken(token,checkData.userPhone,function(tokenIsValid){
                        if(tokenIsValid){
                            // If any or all of the optional data is provided, update it to the callback copy of the checkData
                            if (protocol){
                                checkData.protocol = protocol;
                            }
                            if (url){
                                checkData.url = url;
                            }
                            if (method){
                                checkData.method = method;
                            }
                            if (successCode){
                                checkData.successCode = successCode;
                            }
                            if (timeoutSeconds){
                                checkData.timeoutSeconds = timeoutSeconds;
                            }

                            // Persist the Changes to Disk
                            _data.update('checks',id,checkData,function(err){
                                if (!err){
                                    callback(200);
                                }
                                else{
                                    callback(500,{'Error':'Couldnot update checkData'});
                                }
                            });

                        }
                        else{
                            callback(403,{'Error':'Token Not Valid'});
                        }
                    });
                }
                else{
                    callback(400,{'Error':'Check ID doesnot exist, just like your dreams!'});
                }
            });
        }
        else{
            callback(400,{'Error':'Missing Fields to update; Please provide atleast one Optional Field'});
        }
    }
    else{
        callback(400,{'Error':'Please provide the Specified Fields'});
    }
};

handlers._checks.delete = function(data,callback){
    /*
    *   Required Data: id, token (from headers)
    *   Optional Data: none
    */ 

    // Get the Id
    var id = typeof(data.query.id) == 'string' && data.query.id.trim().length == 20 ? data.query.id.trim() : false;

    if(id){
        // Verify the Id
        _data.read('checks',id,function(err, checkData){
            // If NO error and some check Data, continue
            if (!err && checkData){
                // Get the Token from the headers
                var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
                // Verify the Token
                handlers._tokens.verifyToken(token,checkData.userPhone,function(tokenIsValid){
                    if (tokenIsValid){
                        // First save the userPhone from the checkData
                        var userPhone = checkData.userPhone;
                        
                        // Now, Delete the User Data
                        _data.delete('checks',id,function(err){
                            // If no err => continue on
                            if (!err){
                                // Read the Data using the userPhone
                                _data.read('users',userPhone,function(err, userData){
                                    if (!err && userData){
                                        if (userData.checks.indexOf(id) > -1){
                                            // Get the index of the specific check from the userData
                                            var index = userData.checks.indexOf(id);
                                            
                                            // Delete the specific check from the userData array
                                            userData.checks.splice(index, 1);
                           
                                            // Update the copy in the local disk
                                            _data.update('users',userPhone,userData,function(err){
                                                if (!err){
                                                    callback(200);
                                                }
                                                else{
                                                    callback(500,{'Error':'Couldnot delete the userData'});
                                                }
                                            });
                                        }
                                        else{
                                            callback(500,{'Error':'Couldnot delete checks-entry from userData'});
                                        }
                                    }
                                    else{
                                        callback(500,{'Error':'Cannot locate the users Profile'});
                                    }
                                });
                            }
                            else{
                                callback(500,{'Error':'Cannot delete the check, this is probably an Internal Server Error'});
                            }
                        });
                    }
                    else{
                        callback(403,{'Error':'Invalid Token'});
                    }
                });
            }
            else{
                callback(400,{'Error':'Couldnot read checks Data, make sure the id is correct'});
            }
        });
    }
    else{
        callback(400,{'Error':'Required Fields are missing'});
    }

};

// Handlers for 'home', 'isAlive' and 'notFound' routes
handlers.home = function(data,callback){
	callback(200,{'message':'Welcome Home!'});
};

handlers.isAlive = function(data,callback){
	callback(200);
};

handlers.notFound = function(data,callback){
	callback(404);
};

module.exports = handlers;

/*
Group 3: Be Fit, BU
Varsha Achar
Payton Hauck
Agustin Vasquez
Lingwen Kong

 */

// GETTING API KEYS, checking for node modules

var express = require('express');
router = express.Router();
var config = require('config');
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";
var cities = require('cities');
const FitbitApiClient = require("fitbit-node");
app = express();
const yelp_key = config.get('yelp_api');
const yelp = require('yelp-fusion');
var user_id = "";
var diet = "";
const client = yelp.client(yelp_key);
const weather_key = config.get('weather_api');
const OpenWeatherMapHelper = require("openweathermap-node");
const helper = new OpenWeatherMapHelper(
    {
        APPID: weather_key,
        units: "imperial"
    }
);
const fitbitclient= new FitbitApiClient({
    clientId: config.get('clientId'),
    clientSecret: config.get('clientSecret'),
    apiVersion: '1.2'
});



/* FITBIT AUTHORIZATION */
app.get("/authorize",(req, res) => {
    res.redirect(fitbitclient.getAuthorizeUrl('activity heartrate location nutrition profile settings sleep social weight', 'http://localhost:3000/callback'));
});

// CALLBACK FOR FITBIT AUTHORIZATION
app.get("/callback", (req, res) => {
    fitbitclient.getAccessToken(req.query.code, 'http://localhost:3000/callback').then(result => {
    fitbitclient.get("/profile.json", result.access_token).then(results => {

    // DB CONNECTION TO WRITE STEPS
    MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db("fitbit");

    var myquery = {_id: user_id};
    var newvalues = {$set: {steps: results[0].user.averageDailySteps}};
    dbo.collection("users").updateOne(myquery, newvalues, function (err, res) {
        if (err) throw err;
        console.log("1 document updated");
        db.close();
    });

});
});

res.render('fsuccess', {message: "Fibit Authentication was successful"});
}).catch(err => {
    res.render('error', {message: "Oops, something went wrong!"});
}).catch(err => {
    //sent here when does not properly authenticate
    res.render('error', {message: "Oops, something went wrong!"});
});

});


// LOGOUT ROUTE
app.get("/logout",(req, res) => {
    user_id = "";
    res.redirect(fitbitclient.getAuthorizeUrl('activity heartrate location nutrition profile settings sleep social weight', 'http://localhost:3000/callback', 'login'));
//res.render('error', {message: 'Logout successful!'});
});

/* GET signup page */
app.get('/signup', function (req, res) {
    res.render('signup');
});


/*POST fitbit login page */
app.post('/fitbit', function (req, res) {
    // obtaining entered email and password from pug
    u_name = req.body.email;
    pwd = req.body.password;
    // Connect to dB to check if user exists, verify password, and so on
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db("fitbit");

        dbo.collection("users").findOne({email: u_name}, function (err, result) {
            if (err) throw err;
            if (result == null) res.render('error', {message: "Oops, looks like you don't have an account!"});
            else if (result.password == pwd) {
                user_id = result._id;
                db.close();
                res.render('fitbit');
            }
            else {
                res.render('error', {message: "Incorrect password! Return to login page."})
            }
        });
    });
});

/* POST sign up successful page */
app.post('/signup2', function (req, res) {
    // getting all user entered details to update the database
    f_name = req.body.fname;
    l_name = req.body.lname;
    age = req.body.age;
    gender = req.body.gender;
    u_name = req.body.email;
    pwd = req.body.password;
    height = req.body.height;
    weight = req.body.weight;
    goal = req.body.sgoal;
    diet = req.body.diet;

    // connect to dB to add user or give error if user is already registered
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db("fitbit");

        dbo.collection("users").findOne({email: u_name}, function (err, result) {
            if (err) throw err;
            // if there is no record associated, add to the dB
            if (result == null) {
                user_insert = {firstname: f_name, lastname: l_name, age: age, email: u_name, password: pwd, gender: gender, height: height, weight: weight, sgoal: goal, diet: diet, steps: 0};
                dbo.collection("users").insertOne(user_insert, function(err, res) {
                    if (err) throw err;
                    console.log("new user document inserted");
                    db.close();
                });
                res.render('success');
            }
            else {
                res.render('error', {message: "An account already exists with this email. Please try again"})
            }

        });
    });

});


/* GET index page. */
app.get('/', function (req, res) {
    res.render('index');
});

// GET about us page - has
app.get('/about', function (req, res) {
    res.render('about');
});

//  POST HOMEPAGE
app.post('/homepage', function (req, res) {

    lat = req.body.latitude;
    long = req.body.longitude;
    console.log(lat);
    console.log(long);
    var user_city = "";
    var gps_city = cities.gps_lookup(lat, long);
    if (gps_city === null) {
        user_city = gps_city.city;
    }

    // current timestamp in seconds
    var timestamp = Math.floor(Date.now() / 1000);

    user_city = "Boston";

    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        var dbo = db.db("fitbit");

        // find a city
        dbo.collection("weather").findOne({city: user_city}, function(err, result) {
            if (err) throw err;
            // if city doesn't exist -- make API call and add to database
            if (result == null) {
                helper.getCurrentWeatherByCityName(user_city, (err, currentWeather) => {
                    if(err){
                        console.log(err);
                    }
                    else{
                        var to_insert = { timestamp: timestamp, city: user_city, weather: currentWeather.main.temp, description: currentWeather.weather[0].description };
                // add it to the db
                dbo.collection("weather").insertOne(to_insert, function(err, res) {
                    if (err) throw err;
                    console.log("new weather document inserted");
                });
            }
            });
            }
            // if last check was 30 min ago
            else if (timestamp - result.timestamp > 1800)  {
                helper.getCurrentWeatherByCityName(user_city, (err, currentWeather) => {
                    if(err){
                        console.log(err);
                    }
                    else{
                        // add it to the db
                        var myquery = {city: user_city};
                var newvalues = {$set: {timestamp: timestamp, weather: currentWeather.main.temp, description: currentWeather.weather[0].description }};
                dbo.collection("weather").updateOne(myquery, newvalues, function(err, res) {
                    if (err) throw err;
                    console.log("new weather document updated");
                });
            }
            });
            }

        });
        var message = "";
        // now, retrieving from database to render it on the front end
        dbo.collection("weather").findOne({city: user_city}, function(err, result) {
            if (err) throw err;
            dbo.collection("users").findOne({_id: user_id}, function (err, resu) {
                if (err) throw err;
                if (resu === null) {
                    display_name = "";
                    steps = 0;
                    my_goal = 0;
                }
                else {
                    display_name = resu.firstname;
                    steps = resu.steps;
                    my_goal = resu.sgoal;
                    diet = resu.diet;

                    if (my_goal > steps) {
                        if (result.weather > 40.0 && result.weather <= 75.0) {
                            message = "It is nice enough to go for a run outside";
                        }
                        else if (result.weather >= 40.0 && result.weather <= 75.0 && result.description === "rain") {
                            message = "Maybe it's not a good time to go for a run, cause of the rain";
                        }
                        else if (result.weather < 40.0) {
                            message = "It is too cold for a run!";
                        }
                        else if (result.weather > 75.0) {
                            message = "It is too hot for a run!";
                        }
                    }
                    else {
                        message = "WELL DONE! You've achieved your goal! Reward yourself!";
                    }
                }
                db.close();
                res.render('homepage', {msg: message, goal: my_goal, avgsteps: steps, name: display_name, temp: result.weather, desc: result.description});
            });

        });

    });

});

// GET HOMEPAGE
app.get('/homepage', function (req, res) {


    //var city = cities.gps_lookup(32.7830600, -96.8066700); -- THIS IS FOR PICKING UP lOCATION
    //var user_city = city.city;   -- THIS TOO
    var user_city = "Boston";

    // current timestamp in seconds
    var timestamp = Math.floor(Date.now() / 1000);

    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        var dbo = db.db("fitbit");

        // find a city
        dbo.collection("weather").findOne({city: user_city}, function(err, result) {
            if (err) throw err;
            // if city doesn't exist -- make API call and add to database
            if (result == null) {
                helper.getCurrentWeatherByCityName(user_city, (err, currentWeather) => {
                    if(err){
                        console.log(err);
                    }
                    else{
                        var to_insert = { timestamp: timestamp, city: user_city, weather: currentWeather.main.temp, description: currentWeather.weather[0].description };
                // add it to the db
                dbo.collection("weather").insertOne(to_insert, function(err, res) {
                    if (err) throw err;
                    console.log("new weather document inserted");
                });
            }
            });
            }
            // if last check was 30 min ago
            else if (timestamp - result.timestamp > 1800)  {
                helper.getCurrentWeatherByCityName(user_city, (err, currentWeather) => {
                    if(err){
                        console.log(err);
                    }
                    else{
                        // add it to the db
                        var myquery = {city: user_city};
                var newvalues = {$set: {timestamp: timestamp, weather: currentWeather.main.temp, description: currentWeather.weather[0].description }};
                dbo.collection("weather").updateOne(myquery, newvalues, function(err, res) {
                    if (err) throw err;
                    console.log("new weather document updated");
                });
            }
            });
            }

        });
        var message = "";
        // now, retrieving from database to render it on the front end
        dbo.collection("weather").findOne({city: user_city}, function(err, result) {
            if (err) throw err;
            dbo.collection("users").findOne({_id: user_id}, function (err, resu) {
                if (err) throw err;
                if (resu === null) {
                    display_name = "";
                    steps = 0;
                    my_goal = 0;
                }
                else {
                    display_name = resu.firstname;
                    steps = resu.steps;
                    my_goal = resu.sgoal;

                    if (my_goal > steps) {
                        if (result.weather > 40.0 && result.weather <= 75.0) {
                            message = "It is nice enough to go for a run outside";
                        }
                        else if (result.weather >= 40.0 && result.weather <= 75.0 && result.description === "rain") {
                            message = "Maybe it's not a good time to go for a run, cause of the rain";
                        }
                        else if (result.weather < 40.0) {
                            message = "It is too cold for a run!";
                        }
                        else if (result.weather > 75.0) {
                            message = "It is too hot for a run!";
                        }
                    }
                    else {
                        message = "WELL DONE! You've achieved your goal! Reward yourself!";
                    }
                }
                db.close();
                res.render('homepage', {msg: message, goal: my_goal, avgsteps: steps, name: display_name, temp: result.weather, desc: result.description});
            });

        });
    });

});

/* GET PROFILE PAGE */
app.get('/profile', function (req, res) {

    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        var dbo = db.db("fitbit");

        // find a city
        dbo.collection("users").findOne({_id: user_id}, function(err, result) {
            if (err) throw err;
            // if city doesn't exist -- make API call and add to database
            if (result == null) {
                res.render('profile', {errmsg: "Can't display as you are not logged in"})
            }
            else {
                res.render('profile', {fname: result.firstname, lname: result.lastname, email: result.email, age: result.age, gender: result.gender, height: result.height, weight: result.weight, goal: result.sgoal, diet: result.diet, steps: result.steps});
            }
        });

    });
});

/* GET Fitness page */
app.get('/fitness', function (req, res) {

    var location = "Boston";

    /************************ GYM **********************/
    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        var dbo = db.db("fitbit");


        dbo.collection("yelp").findOne({term: "gym", location: location}, function(err, result) {
            if (err) throw err;
            // if gym and location combo doesn't exist -- make API call and add to database
            if (result == null) {

                client.search({term: "gym", location: location}).then(response => {

                    g = response.jsonBody.businesses[0];

                var gym_insert = { term: "gym", location: location, name: g.name, rating: g.rating, address: g.location.display_address, phone: g.display_phone };
                // add it to the db
                dbo.collection("yelp").insertOne(gym_insert, function(err, res) {
                    if (err) throw err;
                    console.log("new gym document inserted");
                    db.close();
                });
            });
            }
        });
    });

    /************************ YOGA **********************/
    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        var dbo = db.db("fitbit");

        dbo.collection("yelp").findOne({term: "yoga", location: location}, function(err, result) {
            if (err) throw err;
            // if yoga and location combo doesn't exist -- make API call and add to database
            if (result == null) {

                client.search({term: "yoga", location: location}).then(response => {

                    y = response.jsonBody.businesses[0];

                var yoga_insert = { term: "yoga", location: location, name: y.name, rating: y.rating, address: y.location.display_address, phone: y.display_phone };
                // add it to the db
                dbo.collection("yelp").insertOne(yoga_insert, function(err, res) {
                    if (err) throw err;
                    console.log("new yoga document inserted");
                    db.close();
                });
            });
            }
        });
    });

    /************************ PILATES **********************/
    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        var dbo = db.db("fitbit");

        dbo.collection("yelp").findOne({term: "pilates", location: location}, function(err, result) {
            if (err) throw err;
            // if pilates and location combo doesn't exist -- make API call and add to database
            if (result == null) {

                client.search({term: "pilates", location: location}).then(response => {

                    pil = response.jsonBody.businesses[0];

                var pilates_insert = { term: "pilates", location: location, name: pil.name, rating: pil.rating, address: pil.location.display_address, phone: pil.display_phone };
                // add it to the db
                dbo.collection("yelp").insertOne(pilates_insert, function(err, res) {
                    if (err) throw err;
                    console.log("new pilates document inserted");
                    db.close();
                });
            });
            }
        });
    });

    /************************ TRAINER **********************/
    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        var dbo = db.db("fitbit");

        dbo.collection("yelp").findOne({term: "trainer", location: location}, function(err, result) {
            if (err) throw err;
            // if trainer and location combo doesn't exist -- make API call and add to database
            if (result == null) {

                client.search({term: "trainer", location: location}).then(response => {

                    train = response.jsonBody.businesses[0];

                var train_insert = { term: "trainer", location: location, name: train.name, rating: train.rating, address: train.location.display_address, phone: train.display_phone };
                // add it to the db
                dbo.collection("yelp").insertOne(train_insert, function(err, res) {
                    if (err) throw err;
                    console.log("new trainer document inserted");
                    db.close();
                });
            });
            }
        });
    });

    /************************ ZUMBA **********************/
    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        var dbo = db.db("fitbit");

        dbo.collection("yelp").findOne({term: "zumba", location: location}, function(err, result) {
            if (err) throw err;
            // if trainer and location combo doesn't exist -- make API call and add to database
            if (result == null) {

                client.search({term: "zumba", location: location}).then(response => {

                    zum = response.jsonBody.businesses[0];

                var zum_insert = { term: "zumba", location: location, name: zum.name, rating: zum.rating, address: zum.location.display_address, phone: zum.display_phone };
                // add it to the db
                dbo.collection("yelp").insertOne(zum_insert, function(err, res) {
                    if (err) throw err;
                    console.log("new zumba document inserted");
                    db.close();
                });
            });
            }
        });

        // RENDERING THE PAGE here -- with all the calls
        dbo.collection("yelp").find({location: location}, { _id: 0 }).sort({term: 1}).toArray(function(err, result) {
            if (err) throw err;
            console.log(result);
            db.close();
            res.render('fitness', {g_name: result[0].name, g_rating: result[0].rating,g_address: result[0].address, g_phone: result[0].phone,
                p_name: result[1].name, p_rating: result[1].rating, p_address: result[1].address, p_phone: result[1].phone,
                t_name: result[2].name, t_rating: result[2].rating, t_address: result[2].address, t_phone: result[2].phone,
                y_name: result[3].name, y_rating: result[3].rating, y_address: result[3].address, y_phone: result[3].phone,
                z_name: result[4].name, z_rating: result[4].rating, z_address: result[4].address, z_phone: result[4].phone});
        });
    });
});

// GET food page
app.get('/food', function (req, res) {

    var location = "Boston";
    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        var dbo = db.db("fitbit");

        dbo.collection("food").findOne({location: location}, function(err, res) {
            if (err) throw err;

            if (res == null) {

                client.search({term: "healthy food", location: location}).then(response => {

                    food1 = response.jsonBody.businesses[0];
                console.log(food1);
                food2 = response.jsonBody.businesses[1];
                food3 = response.jsonBody.businesses[2];
                food4 = response.jsonBody.businesses[3];

                var food1_insert = {location: location, nameofplace: food1.name, rating: food1.rating, address: food1.location.display_address, phone: food1.display_phone };
                // add it to the db
                dbo.collection("food").insertOne(food1_insert, function(err, resu) {
                    if (err) throw err;
                    console.log("new food1 document inserted");
                });

                var food2_insert = {location: location, nameofplace: food2.name, rating: food2.rating, address: food2.location.display_address, phone: food2.display_phone };
                // add it to the db
                dbo.collection("food").insertOne(food2_insert, function(err, resu) {
                    if (err) throw err;
                    console.log("new food2 document inserted");
                });

                var food3_insert = {location: location, nameofplace: food3.name, rating: food3.rating, address: food3.location.display_address, phone: food3.display_phone };
                // add it to the db
                dbo.collection("food").insertOne(food3_insert, function(err, resu) {
                    if (err) throw err;
                    console.log("new food3 document inserted");
                });

                var food4_insert = {location: location, nameofplace: food4.name, rating: food4.rating, address: food4.location.display_address, phone: food4.display_phone };
                // add it to the db
                dbo.collection("food").insertOne(food4_insert, function(err, resu) {
                    if (err) throw err;
                    console.log("new food4 document inserted");
                });
            });
            }
        });

        // RENDER HERE
        if (diet === "") {
            dbo.collection("recipes").aggregate([{$sample: {size: 1}}]).toArray(function(err, resu){
                if (err) throw err;
                r_name = resu[0].name;
                r_ing = resu[0].ingredients;
                r_dir = resu[0].directions;
                dbo.collection("food").find({location: location}, { _id: 0 }).toArray(function(err, result) {
                    if (err) throw err;
                    db.close();
                    res.render('food', {f1_name: result[0].nameofplace, f1_rating: result[0].rating,f1_address: result[0].address, f1_phone: result[0].phone,
                        f2_name: result[1].nameofplace, f2_rating: result[1].rating, f2_address: result[1].address, f2_phone: result[1].phone,
                        f3_name: result[2].nameofplace, f3_rating: result[2].rating, f3_address: result[2].address, f3_phone: result[2].phone,
                        f4_name: result[3].nameofplace, f4_rating: result[3].rating, f4_address: result[3].address, f4_phone: result[3].phone,
                        name: r_name, ingredients: r_ing, directions: r_dir});
                });
            });
        }
        else{
            dbo.collection("recipes").aggregate([{$match: {category: diet}},{$sample: {size: 1}}]).toArray(function(err, resu){
                if (err) throw err;
                r_name = resu[0].name;
                r_ing = resu[0].ingredients;
                r_dir = resu[0].directions;
                dbo.collection("food").find({location: location}, { _id: 0 }).toArray(function(err, result) {
                    if (err) throw err;
                    db.close();
                    res.render('food', {f1_name: result[0].nameofplace, f1_rating: result[0].rating,f1_address: result[0].address, f1_phone: result[0].phone,
                        f2_name: result[1].nameofplace, f2_rating: result[1].rating, f2_address: result[1].address, f2_phone: result[1].phone,
                        f3_name: result[2].nameofplace, f3_rating: result[2].rating, f3_address: result[2].address, f3_phone: result[2].phone,
                        f4_name: result[3].nameofplace, f4_rating: result[3].rating, f4_address: result[3].address, f4_phone: result[3].phone,
                        name: r_name, ingredients: r_ing, directions: r_dir});
                });
            });
        }

    });
});

// GET MUSIC PAGE
app.get('/music', function (req, res) {

    res.render('music');
});

module.exports = app;



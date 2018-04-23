/*
Group 3: Fitbit App
Varsha Achar
Payton Hauck
Agustin Vasquez
Lingwen Kong

 */

var express = require('express');
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";


router = express.Router();
app = express();
// TODO - ADD TO CONFIG FILE
const api_key = 'bfo0qpJ7RAoVa_CMt-TYVTG1pNFWaEE_t2QQYn7PGAdFM03USgsyBWm_2huuFnGExakrN1ag4v-TYdAmn-ywmDXp9tIS9e8uTmRlm_dKjkgauxqikWusn-vy9se6WnYx';
const yelp = require('yelp-fusion');
const client = yelp.client(api_key);

// empty at first
var gymResult = {
    name: "",
    rating: "",
    address: "",
    phone: ""
};

// empty at first
var yogaResult = {
    name: "",
    rating: "",
    address: "",
    phone: ""
};


const OpenWeatherMapHelper = require("openweathermap-node");
const helper = new OpenWeatherMapHelper(
    {
        // TODO - ADD TO CONFIG FILE
        APPID: '067147b8ff7bee8436e1ffb9ec383a2b',
        units: "imperial"
    }
);

/* GET home page. */
app.get('/', function (req, res) {
    res.render('index');
});

// GET about us page
app.get('/about', function (req, res) {
    res.render('about');
});

// GET homepage
app.get('/homepage', function (req, res) {

    var user_city = "Boston";
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
                        console.log(currentWeather)
                        console.log(currentWeather.weather[0].description); //gives description of weather
                        console.log(currentWeather.main.temp);      //gives temp
                        var to_insert = { city: user_city, weather: currentWeather.main.temp, description: currentWeather.weather[0].description };
                        // add it to the db
                        dbo.collection("weather").insertOne(to_insert, function(err, res) {
                        if (err) throw err;
                        console.log("1 document inserted");
                        });
                    }
            });
            }

        });
        // now, retrieving from database to render it on the front end
        dbo.collection("weather").findOne({city: user_city}, function(err, result) {
            if (err) throw err;
            db.close();
            res.render('homepage', {temp: result.weather, desc: result.description});
  });


    });
//
});

/* Fitness page */
app.get('/fitness', function (req, res) {

    // GYMS!
    // Search request for gyms - includes keyword 'gym' and location 'boston' (for now)
    var gymSearchRequest = {
        term: 'gym',
        location: 'boston'
    };


    // noinspection JSAnnotator
    client.search(gymSearchRequest).then(response => {

        g = response.jsonBody.businesses[0];

    console.log(g);  // logging the search results
    gymResult.name = g.name;
    gymResult.address = g.location.display_address;
    gymResult.phone = g.display_phone;
    gymResult.rating = g.rating;


});

    // YOGA!
    // Search request for yoga - includes keyword 'yoga' and location 'boston' (for now)
    var yogaSearchRequest = {
        term: 'yoga',
        location: 'boston'
    };


    // noinspection JSAnnotator
    client.search(yogaSearchRequest).then(response => {

        y = response.jsonBody.businesses[0];

    console.log(y);  // logging the search results
    yogaResult.name = y.name;
    yogaResult.address = y.location.display_address;
    yogaResult.phone = y.display_phone;
    yogaResult.rating = y.rating;

    res.render('fitness', {
        g_name: gymResult.name,
        g_rating: gymResult.rating,
        g_address: gymResult.address,
        g_phone: gymResult.phone, y_name: yogaResult.name,
        y_rating: yogaResult.rating,
        y_address: yogaResult.address,
        y_phone: yogaResult.phone
    });


});

});

// GET food page
app.get('/food', function (req, res) {

    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        var dbo = db.db("fitbit");

        dbo.collection("recipes").findOne({}, function(err, result) {
            if (err) throw err;
            db.close();

            res.render('food', {name: result.name, ingredients: result.ingredients, directions: result.directions});

        });
    });
});

module.exports = app;

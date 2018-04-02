/*
Group 3: Fitbit App
Varsha Achar
Payton Hauck
Agustin Vasquez
Lingwen Kong

This takes a search keyword and a location, to return results from an API call to Yelp.

Linked with index.pug
 */

var express = require('express');
router = express.Router();
app = express();

const yelp = require('yelp-fusion');
const api_key = 'bfo0qpJ7RAoVa_CMt-TYVTG1pNFWaEE_t2QQYn7PGAdFM03USgsyBWm_2huuFnGExakrN1ag4v-TYdAmn-ywmDXp9tIS9e8uTmRlm_dKjkgauxqikWusn-vy9se6WnYx';
const client = yelp.client(api_key);

/* GET home page. */
app.get('/', function (req, res) {
    res.render('fitness');
})
;

app.post('/', function (req, res) {
    var input_keyword = req.body.term;
    var location = req.body.location;

    console.log(req.body)
    var searchRequest = {
        term: input_keyword,
        location: location

    };

    // empty at first
    var firstResult = {
        name: "",
        rating: "",
        address: "",
        phone: ""
    };
    console.log(searchRequest);  // logging for purposes of debugging
    // noinspection JSAnnotator
    client.search(searchRequest).then(response => {

        r = response.jsonBody.businesses[0];

        console.log(r);
        firstResult.name = r.name;
        firstResult.address = r.location.display_address;
        firstResult.phone = r.display_phone;
        firstResult.rating = r.rating;
        const prettyJson = JSON.stringify(firstResult, null, 4);

        res.render('fitness', {
            term: searchRequest.term,
            location: searchRequest.location,
            name: firstResult.name,
            rating: firstResult.rating,
            address: firstResult.address,
            phone: firstResult.phone
        });

    });

    // logging the first result (empty)
    console.log("First result", firstResult);

});

module.exports = app;

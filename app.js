/**
 * 
 */

var express = require('express');
var routes = require ('./routes');
var http = require('http');
var path = require('path');
var app = express();
var engine = require('ejs-locals');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');

app.set('port', process.env.PORT || 8088);
app.engine('ejs', engine);
app.set('views', path.join( __dirname, 'views'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true }));
app.use(bodyParser.json());
app.use( express.static( path.join( __dirname, 'public' )));

app.use(cookieParser());
// TODO: update this with your PennKey
app.use(session({secret: 'mypennkeygoeshere'}));

/////////////////

var aws = require("./keyvaluestore.js");

var friends = new aws('friends');
var users = new aws('users');
var userids = new aws('userids');

friends.init(function() {
	users.init(function() {
		userids.init(function() {
			
			routes.init(friends, users, userids, function() {
				app.get( '/', routes.login);
				app.get( '/index.html', routes.index );
				app.get( '/getdata', routes.getData );
				
				app.get( '/mypath', routes.myfn );
				
				app.get( '/login', routes.login );
				app.get( '/signup', routes.signup );
				app.get( '/home', routes.home );
				
				app.post( '/validate', routes.validate);
				app.get( '/validate', routes.validate);
				
				
			
				/////////////////////
				
				http.createServer( app ).listen( app.get( 'port' ), function(){
					  console.log( 'Open browser to http://localhost:' + app.get( 'port' ));
					} );
			});
		});
	});
});


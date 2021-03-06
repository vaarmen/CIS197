/**
 * Main Web route handling
 */

// Note the use of the exports object.  Each function that we
// assign to exports.XXX is callable by outside modules,
// and we can "hook" to it via routes.XXX.


// These are our key-value stores
var users;
var friends;
var userids;

// We export the init() function to initialize
// our KVS values
exports.init = function(fr,usrs,uids,callback) {
	users = usrs;
	userids = uids;
	friends = fr;
	
	
	callback();
};

/**
 * Default index page fetches some content and returns it
 */
exports.index = function(req, res) {
	var t = '';
	
	// See if the session object in the cookie has
	// been set, and change title correspondingly
	if (!req.session.loadedData)
		t = 'User login or creation';
	else
		t = 'User login or creation logged in (previously fetched data)';
	
	res.render('index', { title: t });
}

exports.getData = function(req, res) {
	// TODO: update this to do the right thing,
	//       or discard this function
	
	// Dummy response:  Consult the KVS and
	// get the list of keys (users who have friends)
	friends.scanKeys(function(err,values) {
		if (err)
			throw err;
		else {
			// Update the session object to remember we've
			// requested data
			req.session.loadedData = true;
			
			// Actually output the data
			res.send(values);
		}
	});
}

/**
 * Example of another function handled by the route
 */
exports.myfn = function(req, res) {
	
	// Trigger index.ejs.  Change the name to trigger a different page.
	
	res.render('index', { title: 'This is an example page' });
}

exports.login = function(req, res) {
	
	// Trigger index.ejs.  Change the name to trigger a different page.
	
	res.render('login', { title: 'Login Page' });
}

exports.signup = function(req, res) {
	
	// Trigger index.ejs.  Change the name to trigger a different page.
	
	res.render('signup', { title: 'This is an example page Armen' });
}

exports.validate = function(req, res) {
	
	// Trigger index.ejs.  Change the name to trigger a different page.
	
	console.log("Form submitted !")
	
	var username = req.body.username
	var password = req.body.password
	//Debug
	console.log(username)
	//
	users.exists(username, function (err, data){
		if(err){
			console.log("Error in validate 1")
			return
		}
		
		if(data){
			
			users.get(username, function(err, data){
				if(err){
					console.log("Error in validate 2")
					return 
				}
				var data = JSON.parse(data) 
				if(password === data.password){
					//TODO remember staff in session cookies
					
					req.session.username = username
					req.session.userid = data.userid
					req.session.fullname = data.fullname
					req.session.loggedIn = true

					
					res.send({"username": username, "errorMessage" : "", "success" : true})
					console.log("Success")
										
				}
				else{
					res.send({"username": username, "errorMessage" : "Wrong Password",
						"success" : false} )
				}
				
			})
			
		}
		else{
			console.log("Start sending")
			res.send({"username": username, "errorMessage" : "Wrong Username",
				"success" : false} )
			console.log("Finish sending")
		}
	})
	//res.render('home', { title: 'This is an example page Armen' });
}

exports.home = function(req,res){
	
	if (!req.session.loggedIn) {
		res.redirect("/")
		return
	}
	
	res.render('home', { title: 'home', 
		userid: req.session.userid,
		username: req.session.username, 
		
	});
}

exports.createAccount = function(req,res){
	
	console.log("Signup Form SUbmitted !")
	
	
	var username  = req.body.username
	var password  = req.body.password
	var firstname  = req.body.firstname
	var lastname = req.body.lastname
	var email = req.body.email
	
	var json =
	{
		username: username,
		password: password,
		firstname: firstname,
		lastname: lastname,
		email: email
	}
	
	console.log(json)
	
	if(username === "" || password === "" || firstname === "" || lastname === "" || email ===""){
		res.send({"errorMessage" : "Please fill out all the fields !",
			"success" : false} );
		return
	}
	
	users.exists(username, function(err,data){
		if(err){
			console.log("Error in create Account")
		}
		
		if(data){
			res.send({"errorMessage" : "Username is already being used !",
				"success" : false} )	
		}
		else{
			json.userid = userids.inx
			
			userids.put(json.userid.toString(), username, function(err, data) {
				if (err) {
					console.log("Error in adding a userid!")
				}
			});
			
			users.put(username, JSON.stringify(json), function(err, data) {
				if (err) {
					console.log("Error in adding a user !")
				}
			});
			
			
			req.session.loggedIn = true
			req.session.username = username
			req.session.userid = json.userid
			res.send({"errorMessage" : "", "success": true })
			
		}
		
	});
}


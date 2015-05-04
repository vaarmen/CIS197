/**
 * Main Web route handling
 */

var _ = require('underscore');
var async = require('async');

// Note the use of the exports object.  Each function that we
// assign to exports.XXX is callable by outside modules,
// and we can "hook" to it via routes.XXX.


// These are our key-value stores
var users;
var friends;
var userids;

//Checks if user1 and user2 are friends 
var areFriends = function(user1, user2, callback) {
	if(!user1 || !user2) {
		console.log('areFriednds supplied with non valid usernames');
		return;
	}
	//console.log(user1);
	var data1 = {};
	var data2 = {};
	async.map([user1,user2],
			function(user,callback) {
				//console.log(user);
				users.get(user, function(err,data) {
					if(err) {
						console.log('cannot access user');
						callback(err);
					} else {
						//console.log(data);
						callback(null,JSON.parse(data));
					
					}
				});
			},
			function(err,results) {
				if(err) {
					console.log(err);
				} else {
					console.log('hello');
					data1 = results[0];
					data2 = results[1];
					console.log(data1);
					console.log(data2);
					var id1 = data1.userid;
					//console.log(id1);
					var id2 = data2.userid;
					console.log("id2 - 1 " + id2);
	
					friends.getSet(id1.toString(), function (err,data) {
						if(err) {
							console.log('Error in accessing friends when checking friendship');
							return;
						} else {
							//var data2 = JSON.parse(data);
							console.log(data);
							
							console.log("id2 - 2 " + id2.toString());
							console.log(user1 + user2);
							//var data2 = JSON.parse(data);
							if(_.contains(data,id2.toString())) {
								callback(null, true);
							} else {
								callback(null,false);
							}
							
							
						}
						
					});


					
				}
			});
	// users.get(user1, function(err,data) {
	// 	if(err) {
	// 		console.log('cannot access user');
	// 	} else {
	// 		console.log(data);
	// 		data1 = data;
	// 		//console.log(user1);
	// 	}
	// });
	
	// users.get(user2, function(err,data) {
	// 	if(err) {
	// 		console.log('cannot access user');
	// 	} else {
	// 		console.log(data);
	// 		data2 = data;
	// 		//console.log(user2);
	// 	}
	// });
	
	// console.log(data1);
	// console.log(data2);
	
}

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
	// get the list of keys (users who have friend
	
	async.series([
	              function(callback) {
	              	console.log("one callback");
	            	  
	      
	friends.scanKeys(function(err,values) {
		if (err)
			throw err;
		else {
			// Update the session object to remember we've
			// requested data
			//req.session.loadedData = true;
			
			// Actually output the data
			res.send(values);
		}
	});
	callback(null,"one");
	
	              },
	              function(callback) {
	              	console.log("two callback");
	              
	
	
	
	areFriends('sample3','sample4', function(err, data) {
		if (err) {
			console.log(err);
		} else {
			console.log(data);
			
		}
		callback(null,"two");
	});
	
	              },
	              function(callback) {
	              	console.log("three callback");
	            	  
	          
	
	areFriends('sample3','user10', function(err, data) {
		if (err) {
			console.log(err);
		} else {
			console.log(data);
			
		}
		callback(null,"three");
	});
	
	              }
	              ],
	              function(err,results) {
	              	if(err) {
	              		console.log('Error in getData');
	              	} else {

						console.log(results);
					}
	}
	);
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
};

exports.home = function(req,res){
	
	if (!req.session.loggedIn) {
		res.redirect("/")
		return
	}
	
	var username = req.session.username;
	if(!username) {
		res.status(401).send('Log in before the request');
	}
	
	users.get(username, function(err,data) {
		if(err) {
			console.log('Error in home 1')
			console.log(err);
		} else {
			data = JSON.parse(data);
			var id = data.userid;
			
			friends.getSet(id.toString(), function(err,data) {
				if(err) {
					console.log('Error in home 2')
					
					console.log(err);
				} else {
					res.render('home', { title: 'home', 
						userid: req.session.userid,
						username: req.session.username, 
						friends: data
						
					});
					
				}
			});
		}
	} );
	
	
	
	
	
	
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
		} else if(data){
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

exports.userWall = function (req,res) {
	var username = req.session.username;
	if(!username) {
		res.status(401).send('Log in before the request');
	} else {
		
		var reqUser = req.query.user;
		
		if(!reqUser) {
			res.status(400).send('No username supplied for the wall page');
		} else {
			
			users.get(reqUser, function(err, data){
				if(err) {
					console.log(err);
					res.status(500).send('error while accessing user');
				} else {
					var reqUserData = JSON.parse(data);
					
					userWall.getSet(reqUser, function(err,data) {
						if(err) {
							console.log(err);
							res.status(500).send('error while accessing user wall posts');
						} else {
							var posts = _.map(data, function(post) {
								return JSON.parse(post);
							});
							
							posts = _.sortBy(posts,'time');
							posts = posts.reverse();

							areFriends(username,reqUser,function(err,result) {
								if(err) {
									console.log(err);
								}


								var locals = {
									user: reqUserData,
									posts: posts
								};

								res.render('userwall',locals);

							});	
						}
					});
					
				}
				
			});
			
		}
	}
}


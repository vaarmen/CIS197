/**
 * Key/value store LOADER -- takes a text file representing a friend network
 * 							 and puts it into a DynamoDB KVS.
 */


// Make sure we got a filename on the command line.
if (process.argv.length < 3) {
  console.log('Usage: node ' + process.argv[1] + ' FILENAME');
  process.exit(1);
}


//This is our DynamoDB KVS
var aws = require("./keyvaluestore.js");
var friends = new aws('friends');

//var images = new aws('images');

//console.log(images.scanKeys());

// Read the file and print its contents.
var fs = require('fs')
  , filename = process.argv[2];

var liner = require('./liner');

var source = fs.createReadStream(filename, {flags: 'r', encoding: 'utf-8'});

source.pipe(liner);

console.log('Reading stream ' + filename + ' ...');

// Initialize the KVS
friends.init(function() {
	
	// Read each line from the file, parse it and load it into the KVS
	liner.on('readable', function() {
		var line;
		var range  = 1000;
		while (line = liner.read()) {
			
			// Split the line into "user, followed" edge
			
			// Note that we leave the values as strings here
			// because our DynamoDB KVS expects the key to be
			// a string.
			var edge = split(line);
			
			// Take the "source" of the edge -- this is the user.
			// Putting a + in front forces Javascript to convert
			// from string to integer, so we can reason about its
			// range
			var user = +edge[0];
//			console.log('hey');
//			console.log(edge[1]);
//			console.log(edge[1].length);
			edge[1] = edge[1].substring(0, edge[1].length - 1);
			
			if(user <= range){
				//console.log(edge[0] +" " + edge[1]);
				friends.addToSet(edge[0], edge[1],function(err, data) {
					if (err)
						console.log("Oops, error" + edge[0] +" " +edge[1]);
				});	
				//console.log(friends.scanKeys());
				//console.log();
			}
			
		
			
			// TODO: test if the user is in the appropriate range 
			// TODO: add the user to the KVS if so

		}

		// Dump the list of keys to the console
		friends.scanKeys(function(err,values) {
			if (err)
				throw err;
			else {
				console.log(values);
				for (var i = 0; i < values.length; i++) {
					console.log(JSON.stringify(values[i]));
				}
			}
		});
	});
	
	console.log('Done with store');
	
});

/**
 * Split a string into a list/array based on space, tab, and/or comma
 */
var split = function(str) {
	return str.split(/[\t ,]+/).map(function(val) { return val; });
}

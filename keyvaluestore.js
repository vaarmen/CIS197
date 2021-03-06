/**
 * Very simple String-based key/value store interface for
 * instructional purpose.  Supports both singleton and
 * multivalued (set) values for individual keys.
 * (CAVEAT: The two should NEVER be mixed.)
 * 
 * @author Zack Ives, University of Pennsylvania, for NETS 212
 *
 */

(function() {
	var AWS = require('aws-sdk');
	AWS.config.loadFromPath('./config.json');

	if (!AWS.config.credentials || !AWS.config.credentials.accessKeyId)
		throw 'Need to update config.json to specify your access key!';

	var db = new AWS.DynamoDB();

	function keyvaluestore(table) {
		this.inx = -1;
	
		this.LRU = require("lru-cache");
	
		this.cache = this.LRU({ max: 500 });
		
		this.tableName = table;
	};

	// Constructor with local cache and index
	
	/**
	 * Initialize the tables
	 * 
	 */
	keyvaluestore.prototype.init = function(callback) {
		var tableName = this.tableName;
		var initCount = this.initCount;
		var self = this;
		
		console.log('Connecting to DynamoDB for table ' + tableName);
		db.listTables(function(err, data) {
			if (err) 
				console.log(err, err.stack);
			else {
				console.log("Connected to AWS DynamoDB");
				
				var tables = data.TableNames.toString().split(",");
				console.log("Tables in DynamoDB: " + tables);
				if (tables.indexOf(tableName) == -1) {
					console.log("Need to create table " + tableName);

					var params = {
							AttributeDefinitions: 
								[ /* required */
								  {
									  AttributeName: 'keyword', /* required */
									  AttributeType: 'S' /* required */
								  },
								  {
									  AttributeName: 'inx', /* required */
									  AttributeType: 'N' /* required */
								  }
								  ],
								  KeySchema: 
									  [ /* required */
									    {
									    	AttributeName: 'keyword', /* required */
									    	KeyType: 'HASH' /* required */
									    },
									    {
									    	AttributeName: 'inx', /* required */
									    	KeyType: 'RANGE' /* required */
									    }
									    ],
									    ProvisionedThroughput: { /* required */
									    	ReadCapacityUnits: 1, /* required */
									    	WriteCapacityUnits: 1 /* required */
									    },
									    TableName: tableName /* required */
					};

					db.createTable(params, function(err, data) {
						if (err) 
							console.log(err, err.stack);
						else {
							self.initCount(callback);
						}
					});
				} else {
					self.initCount(callback);
				}
			}
		}
		);
	}

	/**
	 * Gets the count of how many rows are in the table
	 * 
	 */
	keyvaluestore.prototype.initCount = function(whendone) {
		var self = this;
		var params = {
				TableName: self.tableName,
				Select: 'COUNT'
		};
		
		console.log("Looking for table " + self.tableName);
		
		db.scan(params, function(err, data) {
			if (err)
				console.log(err, err.stack);
			else {
				self.inx = data.ScannedCount;

				console.log("Found " + self.inx + " indexed entries in " + self.tableName);
				whendone();
			}
		});

	}

	/**
	 * Get result(s) by key
	 * 
	 * @param search
	 * 
	 * Callback returns a map from names to values
	 */
	keyvaluestore.prototype.get = function(search, callback) {
		var self = this;

		if (self.cache.get(search))
			callback(null, self.cache.get(search));
		else {
			var params = {
					KeyConditions: {
						keyword: {
							ComparisonOperator: 'EQ',
							AttributeValueList: [ { S: search} ]
						}
					},
					TableName: self.tableName,
					AttributesToGet: [ 'value' ]
			};

			db.query(params, function(err, data) {
				if (err || data.Items.length == 0)
					callback(err, null);
				else {
					self.cache.set(search, data.Items[0].value.S);
					callback(err, data.Items[0].value.S);
				}
			});
		}
	};

	/**
	 * Get result(s) by key
	 * 
	 * @param search
	 * 
	 * Callback returns a map from names to values
	 */
	keyvaluestore.prototype.getSet = function(search, callback) {
		var self = this;
		
		if (self.cache.get(search))
			callback(null, self.cache.get(search));
		else {
			var params = {
					KeyConditions: {
						keyword: {
							ComparisonOperator: 'EQ',
							AttributeValueList: [ { S: search} ]
						}
					},
					TableName: self.tableName,
					AttributesToGet: [ 'value' ]
			};

			db.query(params, function(err, data) {
				if (err || data.Items.length == 0)
					callback(err, null);
				else {
					var items = [];
					for (var i = 0; i < data.Items.length; i++) {
						items.push(data.Items[i].value.S);
					}
					self.cache.set(search, items);
					callback(err, items);
				}
			});
		}
	};

	/**
	 * Test if search key has a match
	 * 
	 * @param search
	 * @return
	 */
	keyvaluestore.prototype.exists = function(search, callback) {
		var self = this;
		
		if (self.cache.get(search))
			callback(null, self.cache.get(search));
		else
			self.get(search, function(err, data) {
				if (err)
					callback(err, null);
				else
					callback(err, (data == null) ? false : true);
			});
	};

	/**
	 * Get result set by key prefix
	 * @param search
	 * @return
	 */
	keyvaluestore.prototype.getPrefix = function(search, callback) {
		var self = this;
		var params = {
				ScanFilter: {
					keyword: {
						ComparisonOperator: 'BEGINS_WITH',
						AttributeValueList: [ { S: search} ]
					}
				},
				TableName: self.tableName,
				AttributesToGet: [ 'value' ]
		};
		
//		console.log(params);
//		console.log(params.KeyConditions.keyword.AttributeValueList[0]);

		db.scan(params, function(err, data) {
//			console.log(err);
//			console.log(data);
			if (err)
				callback(err, null);
			else {
				var items = [];
				for (var i = 0; i < data.Items.length; i++) {
					items.push(data.Items[i].value.S);
				}
				callback(err, items);
			}
		});
	}

	/**
	 * Add a key/value or key/valueset pair
	 * @param keyword
	 * @param category
	 */
	keyvaluestore.prototype.addToSet = function(keyword, value, callback) {
		var self = this;
		
		self.cache.del(keyword);
		// Array?
		if (value && value.constructor === Array) {
			for (var i = 0; i < value.length; i++) {
				var params = {
						Item: {
							"keyword": {
								S: keyword
							},
							"inx": {
								N: self.inx.toString()
							},
							value: { 
								S: value[i]
							}
						},
						TableName: self.tableName,
						ReturnValues: 'NONE'
				};

				db.putItem(params, callback);
				self.inx++;
			}

		} else {
			var params = {
					Item: {
						"keyword": {
							S: keyword
						},
						"inx": {
							N: self.inx.toString()
						},
						value: { 
							S: value
						}
					},
					TableName: self.tableName,
					ReturnValues: 'NONE'
			};

			db.putItem(params, callback);
			self.inx++;
		}
	};

	/**
	 * Add a singleton value for the keyword
	 * 
	 * @param keyword
	 * @param value
	 */
	keyvaluestore.prototype.put = function(keyword, value, callback) {
		var self = this;
		
		self.cache.del(keyword);
		var params = {
				Item: {
					"keyword": {
						S: keyword
					},
					"inx": {
						N: "0"
					},
					value: { 
						S: value
					}
				},
				TableName: self.tableName,
				ReturnValues: 'NONE'
		};

		db.putItem(params, callback);
		self.inx++;
	};

	/**
	 * Gets all of the keys by performing a scan.
	 * Keys will always be treated as strings.
	 * 
	 */
	keyvaluestore.prototype.scanKeys = function(callback) {
		var self = this;
		
		var params = {
				TableName: self.tableName,
				AttributesToGet: [
				                  'keyword'
				]
		};

		db.scan(params, function(err, data) {
			var values = [];
			
			if (!err) {
				for (var i = 0; i < data.Count; i++) {
					values.push(data.Items[i].keyword['S']);
				}
			}
			
			callback(err, values);
		});
	};
	
	/**
	 * Delete an item with the specified key and index
	 * 
	 * @param key
	 * @param index
	 * @param callback
	 */
	keyvaluestore.prototype.delItem = function(key, index, callback) {
		var self = this;
		
		self.cache.del(key);
		
		var params = {
				Key: {
					'keyword': {
						S: key
					},
					'inx': {
						N: String(index)
					}
				},
				TableName: self.tableName
			};

			db.deleteItem(params, callback);
	}
	
	/**
	 * Delete a single item (assuming put/get rather that addToSet/getSet)
	 * 
	 * @param key
	 * @param callback
	 */
	keyvaluestore.prototype.del = function(key, callback) {
		this.delItem(key, 0, callback);
	}
	
	/**
	 * Delete the entire set of items with a key
	 * 
	 * @param key
	 * @param callback
	 */
	keyvaluestore.prototype.delSet = function(key, callback) {
		var self = this;
		this.getIndexValues(key, function(err, data) {
			if (err)
				throw err;
			else {
				for (var i = 0; i < data.length; i++) {
					var map = data[i];
					
					self.delItem(key, data[i].inx, callback);
				}
			}
		});
	}

	keyvaluestore.prototype.getIndexValues = function(search, callback) {
		var self = this;
		
		if (self.cache.get(search))
			callback(null, self.cache.get(search));
		else {
			var params = {
					KeyConditions: {
						keyword: {
							ComparisonOperator: 'EQ',
							AttributeValueList: [ { S: search} ]
						}
					},
					TableName: self.tableName,
					AttributesToGet: [ 'inx', 'value' ]
			};

			db.query(params, function(err, data) {
				if (err || data.Items.length == 0)
					callback(err, null);
				else {
					var items = [];
					for (var i = 0; i < data.Items.length; i++) {
						var map = {
								'keyword': search,
								'inx': data.Items[i].inx.N,
								'value': data.Items[i].value.S 
						}
						items.push(map);
					}
					self.cache.set(search, items);
					callback(err, items);
				}
			});
		}
	};

	keyvaluestore.prototype.test = function() {
		var self = this;
		this.getSet('1', function(err, data) {
			console.log("GET: " + data);
//			if (data && data != 'val2')
//				throw "Wrong value";
		});
		this.getSet('2', function(err, data) {
			if (data) {
				console.log("GET: " + data.length + "... " + data);
//				if (data && data.length != 257)
//					throw "Wrong size";
			}
		});
		this.exists('test', function(err,data) {
			if (!data) {
				this.addToSet('test', 'value', function(err, data) {
					if (err) {
						console.log("Error " + err);
					} else {
						self.getSet('test', function(err, data) {
							console.log("ADD-GET: " + data.length + "... " + data);
						});
					}
				});
			} else
				console.log("test EXISTS");
		});
		this.exists('1', function(err, data) {
			console.log("1 EXISTS: " + data);
			if (!data)
				throw "Should exist";
		});
		
		this.exists('notthere', function(err, data) {
			console.log("notthere EXISTS: " + data);
			if (data)
				throw "Should not exist";
		});
		this.getPrefix('te', function(err, data) {
			console.log("PREFIX: " + data);
		});
		
		this.put('entry', 'foo', function(err, data) {
			if (!err) {
				console.log('Single entry created...')
				self.del('entry', function(err2, data2) {
					if (!err2) {
						console.log('Single entry deleted...')
						self.exists('entry', function(err3, res) {
							if (err3)
								throw err3;
							else
								console.log("Exists? " + res);
						});
					} else
						throw err2;
				});
			} else
				throw err;
		});
		this.getIndexValues('1', function(err, data) {
			if (err)
				throw err;
			else {
				console.log("INDEX VALUES for 1: " + JSON.stringify(data));
			}
		});
		
		this.delSet('test', function(err, data) {
			if (err)
				throw err;
			else
				console.log("Deleted " + JSON.stringify(data));
		});
	}

	module.exports = keyvaluestore;
}());
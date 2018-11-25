# Channels
Starbase Channels

Starbase Channels adds a unix-like directory structure to the Starbase Database and handles the creation and removal of parent and child documents based on channel paths. This allows for documents (channels) with sub-documents, which in turn can have child documents of their own. Channels is great for building APIs based on a path structure.


## Adding Starbase Channels to your Project


### On the Web
```HTML
<script src="/path/to/database.min.js"></script>
<script src="/path/to/channels.min.js"></script>
```

### On the Web via jsdelivr CDN
```HTML
<script src="https://cdn.jsdelivr.net/npm/@starbase/database/database.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@starbase/channels/channels.min.js"></script>
```

### In NodeJS
```bash
npm install @starbase/channels @starbase/database
```


## Using Channels


### Create a channels database in the browser using channels.min.js and database.min.js:
```javascript
var database = Database('testdb');
var db = Channels(database);
```

### Create a database in NodeJS using @starbase/channels and @starbase/database:
```javascript
var Database = require('@starbase/database');
var Channels = require('@starbase/channels');
var database = Database('/path/to/testdb');
var db = Channels(database);
```

## API Methods

- [db.path()](#path)
- [db.onEvent()](#onEvent)
- [db.path().channel()](#channel)
- [db.path().put()](#put)
- [db.path().get()](#get)
- [db.path().del()](#del)
- [db.path().list()](#list)



### <a name="path"></a>db.path(channelPath)
#### The path method returns the CRUD operations for the specified channel path
```javascript
var root = db.path('/');
```
By default, the db object will point to the root path '/'



### <a name="onEvent"></a>db.onEvent(handler)
#### listen for and react to write and delete events
```javascript
db.onEvent(e => {

  // an object with the event information that occured
  console.log(e);

});
```
NOTE: onEvent is only available as a method on base channels object.



### <a name="channel"></a>db.path(path).channel()
#### Return the current channel path in use
```javascript
db.path('/users/mike').channel();
```

#### Response
```JSON
"/users/mike"
```


### <a name="put"></a>db.path(path).put(value)
#### Put data into a document at the path specified and create all parent channels.
```javascript
db.path('/users/mike').put({"name":"Mike"}).then(result => {
  console.log(result);
});
```

NOTE: If the parent channel (in this case "/users") does not exist, this operation will create it. The PUT operation creates all corresponding parents for a child document.


#### Response
```JSON
{
    "event": "write",
    "path": "/users/mike",
    "channel": "/users",
    "key": "mike",
    "timestamp": 1543119035522
}
```


### <a name="get"></a>db.path(path).get()
#### Get data from the document at the path specified.
```javascript
db.path('/users/mike').get().then(result => {
  console.log(result);
});
```

#### Response
```JSON
{
    "path": "/users/mike",
    "channel": "/users",
    "key": "mike",
    "data": {
        "name": "Mike"
    }
}
```


### <a name="del"></a>db.path(path).del()
#### Delete the document, data, and all children from the path specified.
```javascript
db.path('/users').del().then(result => {
  console.log(result);
});
```
NOTE: This operation will DELETE ALL CHILD KEYS below it.


#### Response
```JSON
{
    "event": "delete",
    "paths": [
        "/users",
        "/users/mike"
    ],
    "timestamp": 1543119519439
}
```


### <a name="list"></a>db.path(path).list(query)
#### List the child keys at a specific path
```javascript
db.path('/users').list().then(result => {  
  console.log(result);
});
```

#### Response
```JSON
{
    "data": [
        {
            "path": "/users/dracula",
            "channel": "/users",
            "key": "dracula"
        },
        {
            "path": "/users/ghost",
            "channel": "/users",
            "key": "ghost"
        },
        {
            "path": "/users/mike",
            "channel": "/users",
            "key": "mike"
        }
    ]
}
```

#### List keys with values, ranges, and limits
```javascript
db.path('/users').list({

  // Range in reverse lexicographical order
  "reverse": true,
  
  // Limit results to 2
  "limit":2,
  
  // Return results as objects containing the key and value
  "values": true,
  
  // key must be greater than 'alien'
  "gt": "alien",
  
  // key must be less than 'werewolf'
  "lt": "werewolf"

}).then(result => {  
  console.log(result);
});
```

#### Response
```JSON
{
    "data": [
        {
            "path": "/users/mike",
            "channel": "/users",
            "key": "mike",
            "data": {
                "name": "Mike"
            }
        },
        {
            "path": "/users/ghost",
            "channel": "/users",
            "key": "ghost",
            "data": {
                "name": "ghost"
            }
        }
    ]
}
```

## More Information

### The use of slashes in paths and chaining path methods
The slash in paths denotes the separation of parent channels from child channels. The path method can be chained to achieve the same effect as specifying the complete path.

These two reference objects point to the same location:

```javascript
var comments = db.path('/users/mike/posts/1/comments');
```

```javascript
var comments = db.path('users/mike').path('posts').path('1/comments');
```


### Starbase Channels API Library
#### Documentation for using the API client library is coming soon.

### Using Starbase Database with Starbase Channels

Starbase Database is great for storing data based on single keys. Starbase Channels expands on that idea and allows for keys to have sub-keys. Parent documents to contain child documents. Starbase Channels combined with the Starbase Rules Engine can provide an API gateway solution.

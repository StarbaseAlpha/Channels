'use strict';

// Channels - The db parameter should be a database or memstore object
function Channels(db) {

  let onEvent;

  const eventHandler = (e) => {
    if (onEvent && typeof onEvent === 'function') {
      onEvent(e);
    }
  };

  const Projection = (doc, projection) => {
    let result = {};
    for(let k in doc) {
      if (projection[k]) {
        if (typeof doc[k] === 'object') {
          result[k] = Projection(doc[k],projection[k]);
        } else {
          result[k] = doc[k];
        }
      }
    }
    return result;
  };

  // ParsePath - Parses the requested Path into the useful parts
  const ParsePath = (requestPath) => {

    let reqPath;

    if (requestPath) {
      reqPath = requestPath.toString();
    } else {
      reqPath = '/';
    }

    // Removing trailing, leading, and double slashes and split on slash
    let parts = reqPath.toString()
      .replace(/\/\//g, '/')
      .replace(/^\//, '')
      .replace(/\/$/, '')
      .replace(/\/\//g, '/')
      .split('/');

    // Useful parts
    let channel = '/' + parts.slice(0, -1).join('/');
    let key = parts.slice(-1)[0];
    let slash = "";
    if (channel !== '/') {
      slash = '/';
    }
    let path = channel + slash + key;

    return {
      "path": path,
      "channel": channel,
      "key": key,
      "slash": slash
    };
  };

  // Channel - return an object with CRUD operations directed to the request path
  const Channel = (db, requestPath) => {

    let parsed = ParsePath(requestPath);
    let parsedPath = parsed.path;

    let chan = {

      "channel": () => {
        return parsedPath;
      },

      "put": (data) => {
        return Put(db, parsedPath, data);
      },

      "get": (query) => {
        return Get(db, parsedPath, query);
      },

      "del": () => {
        return Del(db, parsedPath);
      },

      "list": (query) => {
        return List(db, parsedPath, query);
      },

      // the path method provides an instance of Channel pointing to a child path of its parent
      "path": (path) => {
        if (!path) {
          path = "/";
        }
        let slash = "";
        if (parsedPath !== '/') {
          slash = "/";
        }
        return Channel(db, parsedPath + slash + path);
      },

    };

    return chan;

  };

  const Put = (db, requestPath, data) => {
    return new Promise((resolve, reject) => {

      if (!data) {
        return reject({
          "code": 400,
          "message": "Data is required."
        });
      }

      if (requestPath.match(/\!/)) {
        return reject({
          "code": 400,
          "message":"Invalid Path. The exclamation point (!) is a reserved character."
        });
      }

      let {
        path,
        channel,
        key,
        slash
      } = ParsePath(requestPath);

      db.put('!' + channel + '!' + key, data).then(result => {

        let response = {
          "event": result.event,
          "path": channel + slash + (key || ""),
          "channel": channel,
          "key": key || "",
          "timestamp": result.timestamp
        };

        if (channel === '/' && (!key || key === '')) {
          eventHandler(response);
          return resolve(response);
        }

        Get(db, channel).then(found => {
          eventHandler(response);
          resolve(response);
        }).catch(err => {
          Put(db, channel, {}).then(written => {
            eventHandler(response);
            resolve(response);
          }).catch(reject);

        });

      }).catch(reject);

    });
  };

  const Get = (db, requestPath, query) => {
    return new Promise((resolve, reject) => {

      let {
        path,
        channel,
        key,
        slash
      } = ParsePath(requestPath);

      db.get('!' + channel + '!' + key).then(response => {

        if (!response.value) {
          return reject({
            "code": 404,
            "message": "Not Found"
          });
        }

        let result = {
          "path": channel + slash + key,
          "channel": channel,
          "key": key,
          "data": response.value
        };
        if (query && query.projection && typeof query.projection === 'object') {
          result = Projection(result, query.projection);
        }

        if (query && query.children) {
          List(db, result.path, query.children).then(children => {
            result.children = children;
            resolve(result);
          });
        } else {
          resolve(result);
        }

      }).catch(reject);

    });
  };

  const Del = (db, requestPath) => {
    return new Promise((resolve, reject) => {

      let {
        path,
        channel,
        key,
        slash
      } = ParsePath(requestPath);

      db.list({

        "gt": "!" + channel + slash + key + "!",
        "lt": "!" + channel + slash + key + '\uffff' + "/"

      }).then(results => {

        results.unshift('!' + channel + '!' + key);

        db.del(results).then(deleted => {
          let paths = deleted.keys.map(val => {
            return val.replace(/^\!/, '').replace(/\!/g, '/').replace(/\/\//g, '/').replace(/\/\//g,'/');
          });
          let e = {
            "event": deleted.event,
            "paths":paths,
            "timestamp": deleted.timestamp
          };
          eventHandler(e);
          resolve(e);
        });

      });

    });
  };

  const List = (db, requestPath = "/", query = {}) => {
    return new Promise((resolve, reject) => {
      if (typeof query !== 'object') {
        query = {};
      }
      let channel = requestPath.toString();
      let slash = "";
      if (channel !== "/") {
        slash = "/";
        channel = '/' + channel.replace(/^\//, '').replace(/\/$/, '');
      }
      let gt = "!" + channel + ("!" + (query.gt || ""));
      let lt = "!" + channel + ("!" + (query.lt || '\uffff'));
      let deep = query.deep || false;
      if (deep) {
        lt = "!" + channel + slash + '\uffff';
      }
      db.list({
        "gt": gt,
        "lt": lt,
        "reverse": query.reverse || false,
        "values": query.values || false,
        "limit": query.limit || null
      }).then(results => {
        let data = results.map(val => {
          if (typeof val !== 'object') {
            val = {
              "key": val
            };
          }
          let channel = val.key.replace(/^\!/, '').split('!')[0];
          let key = val.key.replace(/^\!/, '').split('!')[1] || '/';
          let slash = "";
          if (channel !== '/') {
            slash = "/";
          }
          let path = channel + slash + key;
          let result = {
            "path": path,
            "channel": channel,
            "key": key,
          };
          if (val.value) {
            result.data = val.value;
          }
          if (query.projection && typeof query.projection === 'object') {
            result = Projection(result, query.projection);
          }
          return result;
        });
        resolve({
          "data": data
        });
      });
    });
  };

  let channel = Channel(db,'/');
  channel.onEvent = (cb) => {
    onEvent = cb;
  };

  return channel;

}

// Support for node.js
if (typeof module !== 'undefined' && module && module.exports) {
  module.exports = Channels;
}


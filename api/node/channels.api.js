'use strict';

const Request = require('request');

function ChannelsAPI(serverPath) {

  const ParsePath = (requestPath) => {

    let reqPath;

    if (requestPath) {
      reqPath = requestPath.toString();
    } else {
      reqPath = '/';
    }

    let parts = reqPath.toString()
      .replace(/\/\//g, '/')
      .replace(/^\//, '')
      .replace(/\/$/, '')
      .replace(/\/\//g, '/')
      .split('/');

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


  let token = null;

  let channels = {};

  const request = (req) => {
    return new Promise((resolve,reject) => {
      return Request(serverPath,{
        "method":"POST",
        "headers":{
          "content-type":"application/json"
        },
        "body":JSON.stringify({
          "token": token || req.token || "",
          "method":req.method || "",
          "path":req.path || "",
          "data":req.data || {}
        })
      },(err,response,body)=>{
        if (response.statusCode > 399) {
          reject(JSON.parse(body));
        } else {
          resolve(JSON.parse(body));
        }
      });
    });
  };

  const setToken = (newToken) => {
    token = newToken;
    return true;
  };

  const Put = (path,data) => {
    return request({"method":"put","path":path,"data":data});
  };

  const Get = (path) => {
    return request({"method":"get","path":path});
  };

  const Del = (path) => {
    return request({"method":"del","path":path});
  };

  const List = (path,data) => {
    return request({"method":"list","path":path,"data":data});
  };

  const Channel = (requestPath) => {

    let parsed = ParsePath(requestPath);
    let parsedPath = parsed.path;

    let chan = {

      "channel": () => {
        return parsedPath;
      },

      "setToken": (token) => {
        setToken(token);
      },

      "put": (data) => {
        return Put(parsedPath, data);
      },

      "get": () => {
        return Get(parsedPath);
      },

      "del": () => {
        return Del(parsedPath);
      },

      "list": (query) => {
        return List(parsedPath, query);
      },

      "path": (path) => {
        if (!path) {
          path = "/";
        }
        let slash = "";
        if (parsedPath !== '/') {
          slash = "/";
        }
        return Channel(parsedPath + slash + path);
      },

    };

    return chan;

  };

  return Channel('/');

}

module.exports = ChannelsAPI;

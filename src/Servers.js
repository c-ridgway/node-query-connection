const http = require('http');
const udp = require('dgram');
const net = require('net');
const debug = require('./Debug');

class ServerHttp {
  constructor(callback) {
    this.server = http.createServer(callback ? callback : (req, res) => {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Hello, World!\n');
    });
  }

  init(port, bind, callback) {
    if (!net.isIP(bind)) throw new Error(`Invalid bind.`);

    return new Promise((resolve, reject) => {
      this.server.listen(port, bind, async () => {
        if (callback) {
          callback(port, bind);
        }

        resolve(port, bind);
      });
    });
  }

  free() {
    return new Promise((resolve, reject) => {
      this.server.close(() => {
        resolve();
      });
    });
  }
}


class ServerUdp {
  constructor(callback) {
    this.server = null;
  }

  init(port, bind, callback) {
    if (!net.isIP(bind)) throw new Error(`Invalid bind.`);

    return new Promise((resolve, reject) => {
      this.server = udp.createSocket(net.isIPv4(bind) ? 'udp4' : 'udp6');

      this.server.on('listening', () => {
        /*var address = this.server.address();
        var port = address.port;
        var family = address.family;
        var ipaddr = address.address;
        console.log('Server is listening at port' + port);
        console.log('Server ip :' + ipaddr);
        console.log('Server is IP4/IP6 : ' + family);*/
        resolve();
      });

      this.server.on('error', (error) => {
        throw error;
        this.server.close();
      });

      /*this.server.on('message', (msg, info) => {
      });*/

      this.server.bind(port, bind);
    });
  }

  free() {
    return new Promise(async (resolve, reject) => {
      this.server.close(() => {
        resolve();
      });
    });
  }
}

module.exports = { http: ServerHttp, udp: ServerUdp };
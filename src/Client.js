const path = require('path');
const debug = require('./Debug');
const servers = require('./Servers');
const fetch = require('node-fetch');
const net = require('net');

const regHostname = / (^\s*((?=.{1,255}$)[0-9A-Za-z](?:(?:[0-9A-Za-z]|\b-){0,61}[0-9A-Za-z])?(?:\.[0-9A-Za-z](?:(?:[0-9A-Za-z]|\b-){0,61}[0-9A-Za-z])?)*\.?)\s*$)/;
const isValidHostname = (hostname) => regHostname.test(hostname);
const isValidPort = (port) => (port >= 0 && port <= 65535);
const isValidProtocol = (ip) => (ip === 'ipv4' || ip === 'ipv6');
const isValidTransport = (transport) => (transport === 'tcp' || transport === 'udp');
const addressToProtocol = (address) => {
  if (net.isIPv4(address))
    return 'ipv4';

  if (net.isIPv6(address))
    return 'ipv6';

  return null;
};

class Client {
  static async getPorts(pid, transport, protocolOpt) {
    // Sanity check
    pid = Number(pid);
    if (pid && typeof pid !== 'number')
      throw new Error("Missing process id.");

    if (!isValidTransport(transport))
      throw new Error("Missing transport protocol, 'tcp' or 'udp'.");

    //
    let cmd;

    switch (process.platform) {
      case 'win32':
        if (transport == 'tcp') {
          if (!protocolOpt)
            cmd = "netstat -a -n -o | grep 'LISTENING' | grep 'TCP' | awk '{ if ($5 == " + pid + ") print $2 }' | rev | cut -d: -f1  | rev";
          else if (protocolOpt == 'ipv4')
            cmd = "netstat -a -n -o | grep 'LISTENING' | grep 'TCP' | awk '{ if ($5 == " + pid + ") print $2 }' | grep '.' | rev | cut -d: -f1  | rev";
          else if (protocolOpt == 'ipv6')
            cmd = "netstat -a -n -o | grep 'LISTENING' | grep 'TCP' | awk '{ if ($5 == " + pid + ") print $2 }' | grep '[' | rev | cut -d: -f1  | rev";
        } else if (transport == 'udp') {
          if (!protocolOpt)
            cmd = "netstat -a -n -o | grep 'LISTENING' | grep 'UDP' | awk '{ if ($5 == " + pid + ") print $2 }' | rev | cut -d: -f1  | rev";
          else if (protocolOpt == 'ipv4')
            cmd = "netstat -a -n -o | grep 'LISTENING' | grep 'UDP' | awk '{ if ($5 == " + pid + ") print $2 }' | grep '.' | rev | cut -d: -f1  | rev";
          else if (protocolOpt == 'ipv6')
            cmd = "netstat -a -n -o | grep 'LISTENING' | grep 'UDP' | awk '{ if ($5 == " + pid + ") print $2 }' | grep '[' | rev | cut -d: -f1  | rev";
        }
        break;

      case 'linux':
        if (transport == 'tcp') {
          if (!protocolOpt)
            cmd = "netstat -ltnp | grep LISTEN | grep tcp | grep -v - | grep '" + pid + "/' | awk '{ print $4 }' | rev | cut -d: -f1  | rev";
          else if (protocolOpt == 'ipv4')
            cmd = "netstat -ltnp | grep LISTEN | grep -w ^tcp | grep -v - | grep '" + pid + "/' | awk '{ print $4 }' | rev | cut -d: -f1  | rev";
          else if (protocolOpt == 'ipv6')
            cmd = "netstat -ltnp | grep LISTEN | grep -w ^tcp6 | grep -v - | grep '" + pid + "/' | awk '{ print $4 }' | rev | cut -d: -f1  | rev";
        } else if (transport == 'udp') {
          if (!protocolOpt)
            cmd = "netstat -ltnp | grep LISTEN | grep udp | grep -v - | grep '" + pid + "/' | awk '{ print $4 }' | rev | cut -d: -f1  | rev";
          else if (protocolOpt == 'ipv4')
            cmd = "netstat -ltnp | grep LISTEN | grep -w ^udp | grep . | grep -v - | grep '" + pid + "/' | awk '{ print $4 }' | rev | cut -d: -f1  | rev";
          else if (protocolOpt == 'ipv6')
            cmd = "netstat -ltnp | grep LISTEN | grep -w ^udp6 | grep . | grep -v - | grep '" + pid + "/' | awk '{ print $4 }' | rev | cut -d: -f1  | rev";
        }
        break;

      default:
        throw new Error("Unsupported platform '" + process.platform + "'.");
    }

    return new Promise(async (resolve, reject) => {
      let oldPath = process.env.PATH;
      process.env.PATH = process.env.PATH + ";" + path.join(__dirname, '..', 'bin', process.platform);

      require('child_process').exec(cmd, function (error, stdout, stderr) {
        let output = stdout
          .split(/\r?\n/) // Split lines into array
          .filter((element, index, arr) => arr.indexOf(element) === index) // Remove duplicates
          .map(element => Number(element)) // Convert them into numbers
          .filter(element => element); // Remove NaN elements

        resolve(output);

        process.env.PATH = oldPath;
      });

      /*let resolver = new Resolver(resolve);

      resolver.wrap(() => {
          let oldPath = process.env.PATH;
          process.env.PATH = process.env.PATH + ";" + path.join(process.cwd(), 'bin', process.platform);

          require('child_process').exec(cmd, function(error, stdout, stderr) {
              let output = stdout.split(/\r?\n/).filter(element => element); // Split lines into array and remove empty elements
              resolver.return(output);

              process.env.PATH = oldPath;
          });
      });*/
    });

    //darwin
  }

  static async getPid(port, hostOpt) {
    // Sanity check
    port = Number(port);
    if (port && typeof port !== 'number')
      throw new Error("Missing port.");

    if (hostOpt && !this.isValidAddress(hostOpt)) throw new Error("Invalid host.");

    //
    let cmd;

    switch (process.platform) {
      case 'win32':
        if (hostOpt)
          cmd = "netstat -a -n -o | awk '{ if ($2 == \"" + hostOpt + ":" + port + "\") print $5 }' | uniq | head -n 1";
        else
          cmd = "netstat -a -n -o | awk '{ if ($2 ~ \"" + port + "\") print $5 }' | uniq | head -n 1";
        break;

      case 'linux':
        if (hostOpt)
          cmd = "lsof -i @" + hostOpt + ":" + port + " | sed -n 2p | awk '{ print $2 }'";
        else
          cmd = "lsof -i :" + port + " | sed -n 2p | awk '{ print $2 }'";
        break;

      default:
        throw new Error("Unsupported platform '" + process.platform + "'.");
    }

    return new Promise((resolve, reject) => {
      let oldPath = process.env.PATH;
      process.env.PATH = process.env.PATH + ";" + path.join(process.cwd(), 'bin', process.platform);

      require('child_process').exec(cmd, function (error, stdout, stderr) {
        let output = stdout.split(/\r?\n/).filter(element => element); // Split lines into array and remove empty elements

        if (stderr.length > 0) reject(stderr);
        resolve(output.shift());

        process.env.PATH = oldPath;
      });
    });
  }

  static async getWanAddress(protocol) {
    // Sanity check
    if (!['ipv4', 'ipv6'].includes(protocol))
      throw new Error("Missing internet protocol, 'ipv4' or 'ipv6'.");

    //
    let cmd;
    if (protocol == 'ipv4')
      cmd = "dig +short -4 myip.opendns.com @resolver1.opendns.com";
    else if (protocol == 'ipv6')
      cmd = "dig +short -6 myip.opendns.com aaaa @resolver1.ipv6-sandbox.opendns.com";

    return new Promise((resolve, reject) => {
      let oldPath = process.env.PATH;
      process.env.PATH = process.env.PATH + ";" + path.join(process.cwd(), 'bin', process.platform);

      require('child_process').exec(cmd, function (error, stdout, stderr) {
        let output = stdout.split(/\r?\n/).filter(element => element); // Split lines into array and remove empty elements

        if (stderr.length > 0) reject(stderr);
        resolve(output.shift());

        process.env.PATH = oldPath;
      });
    });
  }

  static async getWanAddressIpv4() {
    return this.getWanAddress('ipv4');
  }

  static async getWanAddressIpv6() {
    return this.getWanAddress('ipv6');
  }

  // Checks if remote port is listening
  static isPortOpen(host, port, transport) {
    if (debug.invalid(host)) throw new Error("Invalid host.");
    if (debug.invalid(port) && typeof Number(port) !== 'number') throw new Error("Missing port.");
    if (!isValidTransport(transport)) throw new Error(`Invalid transport parameter '${transport}'.`);

    //
    let cmd;

    switch (process.platform) {
      case 'win32':
        if (transport == 'tcp') {
          cmd = 'nc -z -v -w 2 ' + host + ' ' + port + ' 2>&1 | grep ""';
        } else if (transport == 'udp') {
          cmd = 'nc -z -vu -w 2 ' + host + ' ' + port + ' 2>&1 | grep ""';
        }
        break;

      case 'linux':
        if (transport == 'tcp') {
          cmd = 'nc -z -v -w 2 ' + host + ' ' + port + ' 2>&1 | grep ""';
        } else if (transport == 'udp') {
          cmd = 'nc -z -vu -w 2 ' + host + ' ' + port + ' 2>&1 | grep ""';
        }
        break;

      default:
        throw new Error("Unsupported platform '" + process.platform + "'.");
    }

    return new Promise((resolve, reject) => {
      let oldPath = process.env.PATH;
      process.env.PATH = process.env.PATH + ";" + path.join(process.cwd(), 'bin', process.platform);

      //console.log(cmd);
      require('child_process').exec(cmd, function (error, stdout, stderr) {
        //let output = stdout.split(/\r?\n/).filter(element => element); // Split lines into array and remove empty elements

        if (stderr.length > 0) reject(stderr);
        resolve(stdout.includes('succeeded'));

        process.env.PATH = oldPath;
      });
    });

    //darwin
  }

  static isPortForwarded(host, port, transport, standalone, attempt) {
    if (debug.invalid(host)) throw new Error("Invalid host.");
    if (debug.invalid(port)) throw new Error("Missing port.");
    if (debug.invalid(transport)) throw new Error("Missing transport.");
    if (!isValidTransport(transport)) throw new Error(`Invalid transport parameter '${transport}'.`);

    attempt = attempt || 0;
    const mirror = this.getExternalMirror(attempt);
    if (!mirror)
      return 2; // Error

    return new Promise(async (resolve, reject) => {
      // Start temp server for checking open port
      let server = null;

      if (standalone) {
        // TCP
        if (transport == 'tcp') {
          server = new servers.http();
          await server.init(port, '0.0.0.0');
        }

        // UDP
        if (transport == 'udp') {
          server = new servers.udp();
          await server.init(port, '0.0.0.0');
        }
      }

      // Request port open check from remote server
      let result = {};
      await fetch(mirror, {
        method: 'post',
        body: JSON.stringify({ transport, host, port }),
        headers: { 'Content-Type': 'application/json' },
      })
        .then(res => res.json())
        .then(json => result = json)
        .catch(e => {
          result = { error: e, success: 2 } // Loopback server offline or some other error
        });
        
      if (result.error) {
        result.success = await this.isPortForwarded(host, port, transport, false, attempt + 1);
      }

      resolve(result.success);

      if (server) {
        await server.free();
      }
    });
  }

  static getExternalMirror(attempt) {
    const hosts = ['http://ns2panel.ocservers.com:2000', 'http://ropw.duckdns.org:2000'];

    if (attempt >= hosts.length)
      return null;

    return hosts[attempt];
  }

  static isValidAddress(address, protocolOpt) {
    if (!protocolOpt)
      return net.isIP(address);

    if (!isValidProtocol(protocolOpt)) throw new Error(`Invalid protocolOpt parameter '${protocolOpt}'.`);

    return (protocolOpt == 'ipv4') ? net.isIPv4(address) : net.isIPv6(address);
  }

  static isValidAddressIpv4(address) {
    return this.isValidAddress(address, 'ipv4');
  }

  static isValidAddressIpv6(address) {
    return this.isValidAddress(address, 'ipv6');
  }

  static isValidPort(port) {
    return isValidPort(port);
  }
}

module.exports = Client;
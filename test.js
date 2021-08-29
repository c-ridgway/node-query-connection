// This script is just something I use to quickly test functionality
// curl -X POST -d 'protocol=tcp&host=127.0.0.1&port=2001' http://127.0.0.1:2000
const servers = require('./src/Servers');
const client = require('./src/Client');
const debug = require('./src/Debug');

let port = 2000;
let bind = '0.0.0.0';

// Listen for portforward standalone (loopback) request - hosted by c-ridgway
class App {
  constructor() {
  }

  init() {
    // Listen for backend requests
    this.server = new servers.http((req, res) => {
      if (req.method === 'POST') {
        let body = '';

        req.on('data', chunk => {
          body += chunk.toString(); // convert Buffer to string
        });

        req.on('end', () => {
          //const post = qs.parse(body);
          this.handleRequest(req, res, JSON.parse(body));
        });
      } else {
        /*res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end('{ "msg": "Hello, World!" }');*/
      }
    });

    return this.server.init(port, bind).then((port, bind) => {
      console.log(`Server running at http://${bind}:${port}/`);
    });
  }

  free() {
    return this.server.free();
  }

  async handleRequest(req, res, data) {
    const output = {};

    try {
      const { transport, host, port } = data;

      console.log(new Date().toDateString(), transport, host, port);

      if (debug.invalid(transport)) throw new Error(`Missing parameter protocol.`);
      if (!['tcp', 'udp'].includes(transport)) throw new Error(`Invalid transport parameter '${transport}'.`);
      if (debug.invalid(host)) throw new Error(`Missing parameter host.`);
      if (debug.invalid(port)) throw new Error(`Missing parameter port.`);

      if (transport == 'tcp') await this.handleTcpRequest(output, res, req, host, port);
      if (transport == 'udp') await this.handleUdpRequest(output, res, req, host, port);

      res.statusCode = 200;
    } catch (e) {
      console.log(e);
      output.error = e.message;
      res.statusCode = 400;
    }

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(output));
  }

  async handleTcpRequest(output, res, req, host, port) {
    output.success = (await client.isPortOpen(host, port, 'tcp')) ? 1 : 0;
  }

  async handleUdpRequest(output, res, req, host, port) {
    output.success = (await client.isPortOpen(host, port, 'udp')) ? 1 : 0;
  }
}

const app = new App();
async function init() {
  //await app.init(); // Start portforward dedicated server

  // Test port forwarding in standalone mode (client creates webserver -> send details -> my backend -> client's temp webserver -> client success result
  console.log(await client.isPortForwarded(await client.getWanAddressIpv4(), "2000", "tcp", true));

  /*console.log(await client.isPortForwarded("127.0.0.1", "2200", "tcp", true));
  console.log(await client.isPortForwarded("127.0.0.1", "2201", "udp", true));
  console.log(await client.isPortForwarded("127.0.0.1", "80", "tcp", false));

  let pid;
  console.log(pid = await client.getPid(80, "0.0.0.0"));
  //netstat -ltnp | grep LISTEN | grep tcp | grep .
  console.log(await client.getPorts(pid, "tcp", 'ipv4'));
  console.log(await client.getPorts(pid, "tcp", 'ipv6'));

  console.log(await client.getWanAddressIpv4());
  console.log(await client.getWanAddressIpv6());

  console.log(await client.isPortOpen("127.0.0.1", 80, 'tcp'));

  console.log(await client.isValidAddress("127.0.0.1"));
  console.log(await client.isValidAddress("2407:7000:9c83:cc00:766c:d6a1:1ab3:d7c5"));

  console.log(await client.isValidAddressIpv6("2107:7000:9c83:cc00:766c:d6a1:1ab3:d7c5"));
  console.log(await client.isValidAddressIpv4("21.252.224.169"));

  console.log(await client.isValidPort(22000));
  console.log(await client.isValidPort(122000));*/
}

init();
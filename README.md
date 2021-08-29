query-connection
=======

**Rewritten and working as of 2021/03/15.**

This is a lightweight crossplatform (Win/Linux) network connection query library.
Capabilities: Test port forwarding, get open ports from a process, get process of an open port, validate ip addresses/ports, get accurate wan address.

Installation
------------

```
npm install --save query-connection
```

Usage
-----

#### [Test Environment]
```js
const qc = require('query-connection');

async function test() {
  // Get wan ip address
  let hostIpv4 = await qc.getWanAddressIpv4();
  console.log( hostIpv4 );

  // Test port forwarding
  console.log( await qc.isPortForwarded( hostIpv4, 4000, 'tcp', true ) );
}

test();
```

#### Get WAN ip address

> Attempts to retrieve your gateway's ip address.

```js
await qc.getWanAddressIpv4(); // Returns 'xxx.xxx.xxx.xxx'
await qc.getWanAddressIpv6(); // Returns 'xxxx:xxxx:xxxx:xxxx:xxxx:xxxx:xxxx:xxxx'
  
await qc.getWanAddress('ipv4'|'ipv6');
```

#### Check if port forwarded (probes uses an external service)

> Checks if visible from an outside network
> You may specify to host a temporary standalone server if an application is not already listening on port.

```js
await qc.isPortForwarded(host, port, 'tcp'|'udp', standalone); // Returns 0 (false), 1 (true), 2 (external service offline)
await qc.isPortForwarded( qc.getWanAddressIpv4(), 80, 'tcp', false ); // Test for a webserver using an external probe
await qc.isPortForwarded( qc.getWanAddressIpv4(), 3000, 'udp', true );  // Launches a temporary server and then probe externally
```

#### Check if port open (probes directly, check if an outside server is port forwarded or online)

> This will not check if a host and port is visible from outside the network.

```js
await qc.isPortOpen(host, port, 'tcp'|'udp'); // Returns bool of whether it's open
await qc.isPortOpen( qc.getWanAddressIpv4(), 80, 'tcp' ); // To test for a webserver
```

#### Get ports from a pid (process id)

> Find all of the listening ports associated with a process ID.

```js
await qc.getPorts(pid, 'tcp'|'udp', 'ipv4'|'ipv6'); // Returns array of ports
await qc.getPorts( await client.getPid(80, "0.0.0.0"), 'tcp', 'ipv4' ); // Get ports of local webserver listening on port 80

// Check all ports in current application are open
const process = require('process');

let ports = await qc.getPorts(process.pid, 'tcp', 'ipv4');
ports.forEach((port) => {
  let result = await qc.isPortForwarded(await this.getWanAddressIpv4(), port, 'tcp');
  if (result)
    console.log(port + ' is port forwarded'!);
}
```

#### Get a pid from a port

> Host basically means the address a port is bound to, for all omit or for ipv4 use '0.0.0.0'.

```js
await qc.getPid(port, hostOpt); // Returns a process id using open port and optionally host (local ip address)
```

#### Validate ip address/port

```js
qc.isValidAddressIpv4('8.8.8.8');
qc.isValidAddressIpv6('2001:4860:4860::8888');
qc.isValidAddress('8.8.8.8'); // Returns 4 for ipv4, 6 for ipv6, 0 for invalid
qc.isValidPort(1234);
```

#### External library credits - win32
Most of the core utilities come from msys2:
https://www.msys2.org/

Dig (BIND 9) provided by:
https://www.isc.org/download/

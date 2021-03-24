#!/usr/local/bin/node
import http from 'http';

const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer((req, res) => {
  var body = '';
  req.on('data', function (chunk) {
    body += chunk;
  });

  req.on('end', function () {
    body = body.replace(/\n/gmi, '');
    body = body.replace(/\s+/gmi, ' ');

    let payload;
    try {
      payload = JSON.parse(body);
    } catch (e) {
      console.log(new Date(), 'Failed to parse body', body);
    }

    if (
      !payload.price ||
      !payload.pair ||
      !payload.time ||
      payload.email_token !== 'f9b645ae-484d-4206-b8df-e8c6fe8efaab'
    ) {
      console.log(new Date(), 'Incorrect payload format', body);
    } else if (new Date().getTime() - new Date(payload.time).getTime() > 3 * 60 * 1000) {
      console.log(new Date(), 'Signal is outdated', body);
    } else {
      console.log(new Date(), 'Received payload', body);
    }

    res.writeHead(200);
    res.end(body);
  });
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

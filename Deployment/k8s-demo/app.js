const http = require('http');
const prometheus = require('prom-client');

const collectDefaultMetrics = prometheus.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });

const httpRequestDurationMicroseconds = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in microseconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const server = http.createServer((req, res) => {
  const end = httpRequestDurationMicroseconds.startTimer();
  
  if (req.url === '/metrics') {
    res.setHeader('Content-Type', prometheus.register.contentType);
    prometheus.register.metrics().then(data => {
      res.end(data);
    });
  } else {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Hello from Kubernetes!');
  }
  
  end({ method: req.method, route: req.url, code: res.statusCode });
});

const port = 3000;
server.listen(port, () => {
  console.log();
});

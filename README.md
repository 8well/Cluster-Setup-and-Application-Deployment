# Deploying and Monitoring a Kubernetes Application

This guide walks you through deploying and monitoring a simple application in a Kubernetes environment using Minikube.

## Prerequisites

- Docker
- kubectl
- Minikube
- Helm
- Go (for installing 'hey')
- Node.js and npm (for local testing if needed)

## 1. Set up Minikube

```bash
# Install Minikube (if not already installed)
brew install minikube

# Start Minikube with adjusted resources
minikube start --cpus 2 --memory 3800

# Verify installation
kubectl get nodes

````markdown

2. Create the Application
Create project directory and app.js
bashCopymkdir k8s-demo && cd k8s-demo

cat << EOF > app.js
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
  console.log(`Server running on port ${port}`);
});
EOF
Create package.json
bashCopycat << EOF > package.json
{
  "name": "k8s-demo",
  "version": "1.0.0",
  "main": "app.js",
  "dependencies": {
    "prom-client": "^14.0.1"
  },
  "scripts": {
    "start": "node app.js"
  }
}
EOF
Create Dockerfile
bashCopycat << EOF > Dockerfile
FROM node:14
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY app.js .
EXPOSE 3000
CMD [ "node", "app.js" ]
EOF
3. Build and Deploy the Application
Build the Docker image
bashCopyeval $(minikube docker-env)
docker build -t k8s-demo:v1 .
Create deployment.yaml
bashCopycat << EOF > deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: k8s-demo
spec:
  replicas: 3
  selector:
    matchLabels:
      app: k8s-demo
  template:
    metadata:
      labels:
        app: k8s-demo
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: k8s-demo
        image: k8s-demo:v1
        imagePullPolicy: Never
        ports:
        - containerPort: 3000
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 256Mi
EOF
Apply the deployment and verify
bashCopykubectl apply -f deployment.yaml
kubectl get pods
kubectl describe deployment k8s-demo
4. Create a Kubernetes Service
Create service.yaml
bashCopycat << EOF > service.yaml
apiVersion: v1
kind: Service
metadata:
  name: k8s-demo-service
spec:
  selector:
    app: k8s-demo
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: ClusterIP
EOF
Apply the service and verify
bashCopykubectl apply -f service.yaml
kubectl get services
kubectl describe service k8s-demo-service
5. Set up Ingress
Enable Ingress addon and create ingress.yaml
bashCopyminikube addons enable ingress

cat << EOF > ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: k8s-demo-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$1
spec:
  rules:
  - host: k8s-demo.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: k8s-demo-service
            port: 
              number: 80
EOF
Apply the ingress and configure local DNS
bashCopykubectl apply -f ingress.yaml
echo "$(minikube ip) k8s-demo.local" | sudo tee -a /etc/hosts
kubectl get ingress
kubectl describe ingress k8s-demo-ingress
6. Verify Application Deployment
bashCopy# Set up port forwarding
kubectl port-forward service/k8s-demo-service 8080:80 &

# Test the application
curl http://localhost:8080

# Check application logs
kubectl logs -l app=k8s-demo

# Check metrics endpoint
curl http://localhost:8080/metrics

# Stop port forwarding when done
kill %1
7. Install Prometheus and Grafana
Add Helm repositories and create namespace
bashCopyhelm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

kubectl create namespace monitoring
Install Prometheus
bashCopyhelm install prometheus prometheus-community/prometheus \
  --namespace monitoring \
  --set alertmanager.persistentVolume.storageClass="standard" \
  --set server.persistentVolume.storageClass="standard"
Install Grafana
bashCopyhelm install grafana grafana/grafana \
  --namespace monitoring \
  --set persistence.storageClassName="standard" \
  --set persistence.enabled=true \
  --set adminPassword='admin' \
  --values - <<EOF
datasources:
  datasources.yaml:
    apiVersion: 1
    datasources:
    - name: Prometheus
      type: prometheus
      url: http://prometheus-server.monitoring.svc.cluster.local
      access: proxy
      isDefault: true
EOF
Expose Grafana and get URL
bashCopykubectl expose service grafana --type=NodePort --target-port=3000 --name=grafana-np -n monitoring
minikube service grafana-np -n monitoring --url
8. Configure Grafana Dashboard

Access Grafana using the URL obtained from the last command.
Log in with username admin and password admin.
Import Kubernetes overview dashboard:

Go to "Create" > "Import"
Enter dashboard ID 315
Select "Prometheus" as the data source
Click "Import"


Create a new dashboard for application-specific metrics:

Click "Create" > "Dashboard" > "Add new panel"
In the query editor, enter: rate(http_request_duration_seconds_count[5m])
Add another panel with: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
Add a panel for response codes - bar-chart: sum by (code) (rate(http_request_duration_seconds_count[5m]))


Save the dashboard

9. Send Traffic to the Application and Monitor
bashCopy# Set up port forwarding
kubectl port-forward service/k8s-demo-service 8080:80 &

# Install 'hey' for load testing
go install github.com/rakyll/hey@latest

# Run load test
hey -z 2m -c 50 http://localhost:8080

# Run additional load test (optional)
hey -z 30s -c 100 http://localhost:8080

# Stop port forwarding when done
kill %1
10. Analyze Results

In Grafana, navigate to your custom dashboard.
Observe the request rate and latency graphs during and after the load test.
Check the Kubernetes overview dashboard to see how the load affects cluster-wide metrics.
Analyze:

Peak request rate handled
95th percentile latency during high load
How quickly metrics returned to baseline after the load test
Distribution of response codes



Cleanup
When you're done, clean up your Minikube cluster:
bashCopyminikube stop
minikube delete
This setup provides a solid foundation for developing and testing Kubernetes applications with a focus on observability and performance monitoring.


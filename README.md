# Kubernetes Cluster Setup and Application Deployment
1. Introduction
This document outlines the steps taken to set up a local Kubernetes cluster, deploy an application, send traffic to the application, and monitor the traffic. Each step is explained with the reasoning behind the choices made, giving insight into tooling, automation, and security.

2. Kubernetes Cluster Setup
2.1 Choosing a Kubernetes Distribution
Several local Kubernetes distributions were considered, including Minikube and Kind. The choice of Minikube was made due to the following reasons:

Simplicity: Minikube provides an easy setup process, ideal for local development and testing.
Versatility: Supports multiple Kubernetes versions and configurations, making it adaptable to various scenarios, particularly on my laptop.
2.2 Minikube Installation
The installation of Minikube was chosen over other tools like Docker Desktop because it offers more flexibility in customizing resource allocation (CPUs, memory, disk size). This is particularly useful for simulating a more production-like environment on a local machine, with the potential to monitor these resources later on.

2.3 Starting Minikube
The command used to start Minikube (minikube start --cpus=4 --memory=2200 --disk-size=20g) was carefully chosen to allocate sufficient resources to the cluster while also considering the limitations of my laptop. This ensures that the cluster can handle load testing and monitoring tools without performance degradation.

3. Application Deployment
3.1 Creating a Kubernetes Deployment
The application chosen for deployment was nginx, a commonly used lightweight web server. This choice was made for its simplicity, allowing the focus to be on Kubernetes configuration rather than application complexity.

YAML Configuration: The deployment YAML file specifies 2 replicas to demonstrate Kubernetes' ability to manage multiple instances of the same application, providing load balancing and high availability.

Versioning: The use of nginx:latest ensures that the most recent stable version is deployed, taking advantage of the latest features and security patches.

3.2 Exposing the Application
A Service of type LoadBalancer was used to expose the application. This choice was made to:

Enable External Access: LoadBalancer services are designed to route external traffic to the application, making it accessible from outside the cluster.
Simplify Testing: Minikube’s built-in support for exposing services makes it easier to test and access the application without additional network configurations.
4. Sending Load/Traffic to the Application
4.1 Choosing a Load Testing Tool
Several tools were evaluated for generating traffic. Initially, I considered using ping, but after researching on the web, I discovered more suitable options for this task:

Apache Bench (ab): An older tool, suitable for simple load tests.
Hey: Chosen for its modern CLI interface, ease of use, and flexibility in sending a significant number of requests.
Locust: Considered for its ability to simulate more complex user behavior and distributed testing, though unnecessary for this task.
Hey was selected for this task because it offers a good balance between simplicity and functionality, making it ideal for quickly generating load to observe the application’s behavior.

4.2 Running Load Tests
The commands used with Hey (hey -n 1000 -c 50) were designed to send 1000 requests with 50 concurrent users. This level of load was chosen to:

Simulate Real-World Traffic: By using concurrent users, the test simulates a scenario closer to real-world traffic patterns.
Evaluate Application and Cluster Performance: Helps assess how well the Kubernetes cluster and the deployed application handle concurrent requests.
5. Visualizing Traffic and Monitoring
5.1 Choosing Monitoring Tools
Monitoring and visualization are critical for understanding the application’s performance under load. The following tools were considered:

Prometheus & Grafana: A powerful combination for monitoring and visualization. Prometheus is widely used for scraping metrics, while Grafana provides a flexible and feature-rich interface for visualizing these metrics.
Prometheus & Grafana were chosen because they provide:

Comprehensive Metrics: Prometheus can scrape detailed metrics from the Kubernetes cluster and deployed applications.
Customizable Dashboards: Grafana allows for the creation of custom dashboards, offering deep insights into specific metrics like CPU usage, memory, network traffic, and HTTP requests.
5.2 Setting Up Prometheus & Grafana
Prometheus and Grafana were installed using Helm, a package manager for Kubernetes. This choice was made because:

Ease of Deployment: Helm simplifies the deployment of complex applications by managing configurations and dependencies.
Scalability: Helm charts are versioned, making it easy to upgrade or roll back components as needed.
5.3 Monitoring Traffic
The metrics collected by Prometheus include http_requests_total and resource utilization metrics like CPU and memory usage. These metrics were visualized using Grafana to create a dashboard that shows:

Traffic Patterns: Helps identify peak usage times and potential bottlenecks.
Resource Utilization: Provides insights into how the application scales under load, aiding in capacity planning.
[Insert Screenshot of Grafana]

6. Further Considerations in Security and Automation
6.1 Security
Security was considered throughout the process:

Role-Based Access Control (RBAC): Ensured that only authorized users could access and modify Kubernetes resources.
Network Policies: Considered for isolating traffic between different parts of the application, though not implemented in this simple setup.
Container Security: The use of official and up-to-date Docker images (e.g., nginx:latest) reduces the risk of vulnerabilities.
YAML Files: All configuration files were saved and version-controlled, ensuring they can be reused or modified in the future. Storing these resources on Git allows for easy identification of deployment issues by reviewing commit history.
6.2 Automation
Automation plays a crucial role in managing Kubernetes environments:

Helm for Deployments: Used Helm to automate the deployment of monitoring tools, ensuring consistency and repeatability.
CI/CD Integration: Though not implemented in this task, CI/CD pipelines could be used to automate application deployment, scaling, and rollback processes.
[Insert Screenshot of Helm Commands]

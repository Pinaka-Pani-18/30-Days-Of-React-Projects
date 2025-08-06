# Kubernetes Basic Concepts - Hands-On Learning

This guide provides hands-on examples to understand core Kubernetes concepts through practical exercises using our e-commerce platform.

## 🎯 Learning Objectives

- Understand Kubernetes architecture and core components
- Master basic resources: Pods, Services, Deployments
- Learn configuration management with ConfigMaps and Secrets
- Practice debugging and troubleshooting techniques
- Understand resource management and limits

## 📚 Core Concepts Overview

### 1. Kubernetes Architecture

```
┌─────────────────── Control Plane ──────────────────┐
│                                                     │
│  API Server  ←→  etcd  ←→  Scheduler  ←→  Controller │
│                                                     │
└─────────────────────────────────────────────────────┘
                           ↕
┌─────────────────── Worker Nodes ───────────────────┐
│                                                     │
│  kubelet  ←→  Container Runtime  ←→  kube-proxy     │
│                                                     │
│  ┌─────────────── Pods ────────────────┐          │
│  │  Container 1    Container 2         │          │
│  │  (App)         (Sidecar)            │          │
│  └─────────────────────────────────────┘          │
└─────────────────────────────────────────────────────┘
```

### 2. Resource Hierarchy

```
Cluster
└── Namespace
    ├── Deployment
    │   └── ReplicaSet
    │       └── Pod
    │           └── Container
    ├── Service
    ├── ConfigMap
    ├── Secret
    └── Ingress
```

## 🛠️ Hands-On Exercises

### Exercise 1: Understanding Pods

Pods are the smallest deployable units in Kubernetes. Let's create and examine a simple pod.

#### 1.1 Create a Simple Pod

```yaml
# examples/basic-concepts/01-simple-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
  labels:
    app: nginx
    tier: frontend
spec:
  containers:
  - name: nginx
    image: nginx:1.21
    ports:
    - containerPort: 80
    resources:
      requests:
        memory: "64Mi"
        cpu: "50m"
      limits:
        memory: "128Mi"
        cpu: "100m"
```

**Apply and explore:**
```bash
# Create the pod
kubectl apply -f examples/basic-concepts/01-simple-pod.yaml

# Get pod information
kubectl get pod nginx-pod -o wide

# Describe the pod (detailed information)
kubectl describe pod nginx-pod

# Check pod logs
kubectl logs nginx-pod

# Execute commands inside the pod
kubectl exec -it nginx-pod -- /bin/bash

# Clean up
kubectl delete pod nginx-pod
```

#### 1.2 Multi-Container Pod

```yaml
# examples/basic-concepts/02-multi-container-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-container-pod
  labels:
    app: web-app
spec:
  containers:
  - name: web-server
    image: nginx:1.21
    ports:
    - containerPort: 80
    volumeMounts:
    - name: shared-data
      mountPath: /usr/share/nginx/html
  - name: content-puller
    image: busybox
    command: ['sh', '-c', 'while true; do echo "Hello from $(hostname)" > /shared/index.html; sleep 30; done']
    volumeMounts:
    - name: shared-data
      mountPath: /shared
  volumes:
  - name: shared-data
    emptyDir: {}
```

**Key Concepts:**
- Containers in the same pod share network and storage
- Use cases: sidecar pattern, logging, monitoring

### Exercise 2: Deployments and ReplicaSets

Deployments manage ReplicaSets, which ensure the desired number of pod replicas.

#### 2.1 Basic Deployment

```yaml
# examples/basic-concepts/03-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.21
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
```

**Operations:**
```bash
# Create deployment
kubectl apply -f examples/basic-concepts/03-deployment.yaml

# Watch deployment rollout
kubectl rollout status deployment/nginx-deployment

# Scale deployment
kubectl scale deployment nginx-deployment --replicas=5

# Update deployment (rolling update)
kubectl set image deployment/nginx-deployment nginx=nginx:1.22

# Check rollout history
kubectl rollout history deployment/nginx-deployment

# Rollback to previous version
kubectl rollout undo deployment/nginx-deployment

# Rollback to specific revision
kubectl rollout undo deployment/nginx-deployment --to-revision=1
```

### Exercise 3: Services and Service Discovery

Services provide stable networking for pods.

#### 3.1 ClusterIP Service (Internal)

```yaml
# examples/basic-concepts/04-clusterip-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
  labels:
    app: nginx
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 80
    protocol: TCP
  selector:
    app: nginx
```

#### 3.2 NodePort Service (External Access)

```yaml
# examples/basic-concepts/05-nodeport-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-nodeport
  labels:
    app: nginx
spec:
  type: NodePort
  ports:
  - port: 80
    targetPort: 80
    nodePort: 30080
    protocol: TCP
  selector:
    app: nginx
```

#### 3.3 LoadBalancer Service (Cloud)

```yaml
# examples/basic-concepts/06-loadbalancer-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-loadbalancer
  labels:
    app: nginx
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 80
    protocol: TCP
  selector:
    app: nginx
```

**Service Discovery Test:**
```bash
# Create a test pod for service discovery
kubectl run test-pod --image=busybox --rm -it --restart=Never -- /bin/sh

# Inside the test pod:
nslookup nginx-service
wget -qO- http://nginx-service
wget -qO- http://nginx-service.default.svc.cluster.local
```

### Exercise 4: ConfigMaps and Secrets

Configuration management without rebuilding images.

#### 4.1 ConfigMap

```yaml
# examples/basic-concepts/07-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  database_host: "postgres.default.svc.cluster.local"
  database_port: "5432"
  log_level: "INFO"
  app.properties: |
    server.port=8080
    management.endpoints.web.exposure.include=*
    logging.level.root=INFO
```

#### 4.2 Secret

```yaml
# examples/basic-concepts/08-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
data:
  # Base64 encoded values
  username: dXNlcg==  # user
  password: cGFzc3dvcmQ=  # password
  api-key: YWJjZGVmZ2hpams=  # abcdefghijk
```

#### 4.3 Using ConfigMaps and Secrets in Pods

```yaml
# examples/basic-concepts/09-config-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: config-demo
spec:
  containers:
  - name: demo
    image: busybox
    command: ["sleep", "3600"]
    env:
    # Environment variables from ConfigMap
    - name: DATABASE_HOST
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: database_host
    # Environment variables from Secret
    - name: DB_USERNAME
      valueFrom:
        secretKeyRef:
          name: app-secrets
          key: username
    volumeMounts:
    # Mount ConfigMap as files
    - name: config-volume
      mountPath: /etc/config
    # Mount Secret as files
    - name: secret-volume
      mountPath: /etc/secrets
      readOnly: true
  volumes:
  - name: config-volume
    configMap:
      name: app-config
  - name: secret-volume
    secret:
      secretName: app-secrets
```

### Exercise 5: Debugging and Troubleshooting

Essential commands for debugging Kubernetes applications.

#### 5.1 Debugging Checklist

```bash
# 1. Check pod status
kubectl get pods -o wide

# 2. Describe resources for events
kubectl describe pod <pod-name>
kubectl describe deployment <deployment-name>
kubectl describe service <service-name>

# 3. Check logs
kubectl logs <pod-name>
kubectl logs <pod-name> -c <container-name>  # for multi-container pods
kubectl logs -f <pod-name>  # follow logs
kubectl logs --previous <pod-name>  # previous container logs

# 4. Execute commands in containers
kubectl exec -it <pod-name> -- /bin/bash
kubectl exec -it <pod-name> -c <container-name> -- /bin/bash

# 5. Port forwarding for testing
kubectl port-forward pod/<pod-name> 8080:80
kubectl port-forward service/<service-name> 8080:80

# 6. Check resource usage
kubectl top pods
kubectl top nodes

# 7. Check cluster events
kubectl get events --sort-by=.metadata.creationTimestamp

# 8. Network debugging
kubectl run netshoot --rm -it --image=nicolaka/netshoot
```

#### 5.2 Common Issues and Solutions

**Pod Stuck in Pending:**
```bash
# Check node resources
kubectl describe nodes
kubectl top nodes

# Check pod events
kubectl describe pod <pod-name>

# Common causes:
# - Insufficient resources
# - Image pull issues
# - Node selector constraints
```

**Pod CrashLoopBackOff:**
```bash
# Check logs
kubectl logs <pod-name> --previous

# Check resource limits
kubectl describe pod <pod-name>

# Common causes:
# - Application crashes
# - Health check failures
# - Resource limits too low
```

**Service Not Accessible:**
```bash
# Check service endpoints
kubectl get endpoints <service-name>

# Verify labels match
kubectl get pods --show-labels
kubectl describe service <service-name>

# Test connectivity
kubectl run test --rm -it --image=busybox -- wget -qO- http://<service-name>
```

### Exercise 6: Resource Management

Understanding resource requests, limits, and quality of service.

#### 6.1 Resource Requests and Limits

```yaml
# examples/basic-concepts/10-resource-management.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: resource-demo
spec:
  replicas: 2
  selector:
    matchLabels:
      app: resource-demo
  template:
    metadata:
      labels:
        app: resource-demo
    spec:
      containers:
      - name: app
        image: nginx:1.21
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        ports:
        - containerPort: 80
```

#### 6.2 Quality of Service Classes

```bash
# Guaranteed QoS (requests = limits)
resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "128Mi"
    cpu: "100m"

# Burstable QoS (requests < limits)
resources:
  requests:
    memory: "64Mi"
    cpu: "50m"
  limits:
    memory: "128Mi"
    cpu: "100m"

# BestEffort QoS (no requests/limits)
# No resources specified
```

### Exercise 7: Namespaces and Organization

Organizing resources with namespaces.

#### 7.1 Working with Namespaces

```bash
# Create namespace
kubectl create namespace development
kubectl create namespace staging
kubectl create namespace production

# Deploy to specific namespace
kubectl apply -f deployment.yaml -n development

# Set default namespace for context
kubectl config set-context --current --namespace=development

# Get resources from all namespaces
kubectl get pods --all-namespaces

# Get resources from specific namespace
kubectl get pods -n development
```

#### 7.2 Namespace Resource Quotas

```yaml
# examples/basic-concepts/11-resource-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: development
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    pods: "10"
    services: "5"
    persistentvolumeclaims: "4"
```

## 🎯 Practice Scenarios

### Scenario 1: Deploy and Scale a Web Application

1. Deploy nginx with 3 replicas
2. Create a service to expose it
3. Scale to 5 replicas
4. Update to newer nginx version
5. Rollback if issues occur

### Scenario 2: Configuration Management

1. Create ConfigMap with app configuration
2. Create Secret with database credentials
3. Deploy application using both
4. Update configuration and restart pods

### Scenario 3: Debugging Issues

1. Deploy a broken application (wrong image)
2. Identify the issue using kubectl commands
3. Fix the deployment
4. Verify the application works

### Scenario 4: Resource Management

1. Deploy application with resource limits
2. Generate load to test limits
3. Monitor resource usage
4. Adjust limits based on observations

## 📊 Key Takeaways

1. **Pods** are ephemeral and should be managed by higher-level controllers
2. **Deployments** provide declarative updates and rollback capabilities
3. **Services** provide stable networking and load balancing
4. **ConfigMaps** and **Secrets** separate configuration from code
5. **Proper resource management** prevents resource contention
6. **Good labeling** is crucial for selectors and organization
7. **Namespaces** provide resource isolation and organization

## 🔗 Next Steps

After mastering these concepts, proceed to:
- [Advanced Patterns](../advanced-patterns/README.md)
- [Security Concepts](../security/README.md)
- [Scaling Strategies](../scaling/README.md)
- [Service Mesh Integration](../../k8s-manifests/service-mesh/README.md)

## 📖 Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/concepts/)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [Resource Management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Configuration Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)
# Production Deployment Guide - Kubernetes E-Commerce Platform

This guide provides step-by-step instructions for deploying the e-commerce platform to production environments, following enterprise best practices and industry standards.

## 🎯 Overview

Our production deployment strategy follows these principles:
- **GitOps**: All deployments managed through ArgoCD
- **Zero-downtime**: Blue-green and rolling deployments
- **Security**: Multiple layers of security controls
- **Observability**: Comprehensive monitoring and logging
- **Scalability**: Auto-scaling based on demand
- **Disaster Recovery**: Multi-region deployment capability

## 📋 Prerequisites

### Infrastructure Requirements

- **Kubernetes Cluster**: v1.28+ (EKS, GKE, or AKS)
- **Node Requirements**: 
  - Minimum 3 nodes (multi-AZ for HA)
  - 4 vCPUs, 16GB RAM per node
  - 100GB SSD storage per node
- **LoadBalancer**: AWS ALB, GCP Load Balancer, or Azure Load Balancer
- **DNS**: Managed DNS service (Route53, Cloud DNS, Azure DNS)
- **Container Registry**: ECR, GCR, or ACR

### Tools Required

```bash
# Install required tools
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3
curl -sSL -o argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
```

### Access Requirements

- **Cluster Admin**: RBAC permissions to install operators
- **Registry Access**: Push/pull permissions to container registry
- **DNS Management**: Ability to create DNS records
- **SSL Certificates**: Valid SSL certificates or cert-manager setup

## 🏗️ Infrastructure Setup

### 1. Kubernetes Cluster Preparation

#### EKS (Amazon Web Services)
```bash
# Create EKS cluster with managed node groups
eksctl create cluster \
  --name k8s-ecommerce-prod \
  --region us-west-2 \
  --version 1.28 \
  --nodegroup-name workers \
  --node-type m5.xlarge \
  --nodes 3 \
  --nodes-min 3 \
  --nodes-max 10 \
  --managed \
  --zones us-west-2a,us-west-2b,us-west-2c

# Install EBS CSI driver
kubectl apply -k "github.com/kubernetes-sigs/aws-ebs-csi-driver/deploy/kubernetes/overlays/stable/?ref=release-1.24"

# Install AWS Load Balancer Controller
helm repo add eks https://aws.github.io/eks-charts
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=k8s-ecommerce-prod
```

#### GKE (Google Cloud Platform)
```bash
# Create GKE cluster
gcloud container clusters create k8s-ecommerce-prod \
  --machine-type n1-standard-4 \
  --num-nodes 3 \
  --enable-autoscaling \
  --min-nodes 3 \
  --max-nodes 10 \
  --enable-autorepair \
  --enable-autoupgrade \
  --zone us-central1-a

# Get cluster credentials
gcloud container clusters get-credentials k8s-ecommerce-prod --zone us-central1-a
```

#### AKS (Microsoft Azure)
```bash
# Create resource group
az group create --name k8s-ecommerce-rg --location eastus

# Create AKS cluster
az aks create \
  --resource-group k8s-ecommerce-rg \
  --name k8s-ecommerce-prod \
  --node-count 3 \
  --enable-autoscaler \
  --min-count 3 \
  --max-count 10 \
  --node-vm-size Standard_D4s_v3 \
  --enable-addons monitoring

# Get cluster credentials
az aks get-credentials --resource-group k8s-ecommerce-rg --name k8s-ecommerce-prod
```

### 2. Core Infrastructure Components

#### Install Ingress Controller
```bash
# NGINX Ingress Controller
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.replicaCount=2 \
  --set controller.metrics.enabled=true \
  --set controller.podSecurityContext.runAsNonRoot=true \
  --set controller.admissionWebhooks.enabled=true
```

#### Install Cert-Manager
```bash
# Cert-Manager for TLS certificates
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.13.0 \
  --set installCRDs=true \
  --set prometheus.enabled=true
```

#### Install ArgoCD
```bash
# ArgoCD for GitOps
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for ArgoCD to be ready
kubectl wait --for=condition=available --timeout=300s deployment/argocd-server -n argocd

# Get initial admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

## 🔧 Application Deployment

### 1. Namespace Setup

```bash
# Create production namespace
kubectl create namespace production

# Label namespace for monitoring
kubectl label namespace production environment=production
kubectl label namespace production monitoring=enabled
```

### 2. Secrets Management

```bash
# Create database secrets
kubectl create secret generic postgres-credentials \
  --from-literal=username=produser \
  --from-literal=password=secure-password \
  --from-literal=database=ecommerce_prod \
  -n production

# Create JWT secrets
kubectl create secret generic jwt-secrets \
  --from-literal=secret=your-super-secure-jwt-secret \
  -n production

# Create TLS certificates
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@yourdomain.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### 3. Database Deployment

```bash
# Deploy PostgreSQL with persistent storage
kubectl apply -f k8s-manifests/databases/postgres.yaml -n production

# Wait for PostgreSQL to be ready
kubectl wait --for=condition=available --timeout=300s statefulset/postgres -n production

# Initialize database schema (run once)
kubectl exec -it postgres-0 -n production -- psql -U produser -d ecommerce_prod -c "
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);"
```

### 4. Application Services Deployment

```bash
# Build and push Docker images
docker build -t your-registry/user-service:v1.0.0 ./apps/user-service/
docker push your-registry/user-service:v1.0.0

# Apply Kubernetes manifests
kubectl apply -f k8s-manifests/base/user-service/ -n production

# Verify deployment
kubectl get pods -n production -l app=user-service
kubectl logs -f deployment/user-service -n production
```

### 5. Configure ArgoCD Applications

```bash
# Apply ArgoCD applications
kubectl apply -f ci-cd/argocd/application.yaml

# Sync applications
argocd app sync ecommerce-production
argocd app sync monitoring-stack
argocd app sync security-stack
```

## 📊 Monitoring and Observability

### 1. Prometheus and Grafana Setup

```bash
# Install Prometheus stack
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --values - <<EOF
prometheus:
  prometheusSpec:
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: fast-ssd
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 50Gi
    retention: 30d
    replicas: 2

grafana:
  adminPassword: your-secure-password
  persistence:
    enabled: true
    size: 10Gi
  dashboardProviders:
    dashboardproviders.yaml:
      apiVersion: 1
      providers:
      - name: 'default'
        orgId: 1
        folder: ''
        type: file
        disableDeletion: false
        editable: true
        options:
          path: /var/lib/grafana/dashboards/default

alertmanager:
  alertmanagerSpec:
    storage:
      volumeClaimTemplate:
        spec:
          storageClassName: fast-ssd
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 10Gi
EOF
```

### 2. Logging with ELK Stack

```bash
# Install Elasticsearch
helm repo add elastic https://helm.elastic.co
helm repo update

helm install elasticsearch elastic/elasticsearch \
  --namespace logging \
  --create-namespace \
  --set replicas=3 \
  --set minimumMasterNodes=2 \
  --set resources.requests.cpu=1000m \
  --set resources.requests.memory=2Gi \
  --set resources.limits.cpu=2000m \
  --set resources.limits.memory=4Gi \
  --set volumeClaimTemplate.resources.requests.storage=30Gi

# Install Kibana
helm install kibana elastic/kibana \
  --namespace logging \
  --set resources.requests.cpu=500m \
  --set resources.requests.memory=1Gi

# Install Filebeat for log collection
helm install filebeat elastic/filebeat \
  --namespace logging \
  --set daemonset.enabled=true
```

### 3. Distributed Tracing with Jaeger

```bash
# Install Jaeger Operator
kubectl create namespace observability
kubectl apply -f https://github.com/jaegertracing/jaeger-operator/releases/download/v1.50.0/jaeger-operator.yaml -n observability

# Deploy Jaeger instance
kubectl apply -f - <<EOF
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: jaeger-production
  namespace: observability
spec:
  strategy: production
  storage:
    type: elasticsearch
    elasticsearch:
      server-urls: http://elasticsearch-master.logging.svc.cluster.local:9200
  collector:
    replicas: 2
  query:
    replicas: 2
EOF
```

## 🔒 Security Configuration

### 1. RBAC Setup

```bash
# Create service accounts with minimal permissions
kubectl apply -f - <<EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: user-service-sa
  namespace: production
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: production
  name: user-service-role
rules:
- apiGroups: [""]
  resources: ["secrets", "configmaps"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: user-service-binding
  namespace: production
subjects:
- kind: ServiceAccount
  name: user-service-sa
  namespace: production
roleRef:
  kind: Role
  name: user-service-role
  apiGroup: rbac.authorization.k8s.io
EOF
```

### 2. Network Policies

```bash
# Apply network policies for micro-segmentation
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: user-service-netpol
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: user-service
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    - podSelector:
        matchLabels:
          app: api-gateway
    ports:
    - protocol: TCP
      port: 8000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
  - to: []
    ports:
    - protocol: TCP
      port: 53
    - protocol: UDP
      port: 53
EOF
```

### 3. Pod Security Standards

```bash
# Apply Pod Security Standards
kubectl label namespace production pod-security.kubernetes.io/enforce=restricted
kubectl label namespace production pod-security.kubernetes.io/audit=restricted
kubectl label namespace production pod-security.kubernetes.io/warn=restricted
```

## 🚀 Scaling Configuration

### 1. Horizontal Pod Autoscaler

```bash
# Apply HPA for user service
kubectl apply -f - <<EOF
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: user-service-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: user-service
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
      - type: Pods
        value: 4
        periodSeconds: 60
      selectPolicy: Max
EOF
```

### 2. Cluster Autoscaler

```bash
# For EKS
kubectl apply -f https://raw.githubusercontent.com/kubernetes/autoscaler/master/cluster-autoscaler/cloudprovider/aws/examples/cluster-autoscaler-autodiscover.yaml

# For GKE (enable during cluster creation)
gcloud container clusters update k8s-ecommerce-prod \
  --enable-autoscaling \
  --min-nodes 3 \
  --max-nodes 20 \
  --zone us-central1-a

# For AKS
az aks update \
  --resource-group k8s-ecommerce-rg \
  --name k8s-ecommerce-prod \
  --enable-cluster-autoscaler \
  --min-count 3 \
  --max-count 20
```

## 🔄 Backup and Disaster Recovery

### 1. Database Backups

```bash
# Create backup CronJob
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: production
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: postgres-backup
            image: postgres:15-alpine
            command:
            - /bin/bash
            - -c
            - |
              PGPASSWORD=\$POSTGRES_PASSWORD pg_dump -h postgres -U \$POSTGRES_USER \$POSTGRES_DB | \
              gzip > /backup/backup-\$(date +%Y%m%d-%H%M%S).sql.gz
              # Upload to cloud storage
              aws s3 cp /backup/backup-\$(date +%Y%m%d-%H%M%S).sql.gz s3://your-backup-bucket/postgres/
            env:
            - name: POSTGRES_USER
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: username
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: password
            - name: POSTGRES_DB
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: database
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          volumes:
          - name: backup-storage
            emptyDir: {}
          restartPolicy: OnFailure
EOF
```

### 2. Velero for Cluster Backups

```bash
# Install Velero
wget https://github.com/vmware-tanzu/velero/releases/download/v1.12.0/velero-v1.12.0-linux-amd64.tar.gz
tar -xzf velero-v1.12.0-linux-amd64.tar.gz
sudo mv velero-v1.12.0-linux-amd64/velero /usr/local/bin/

# Configure for AWS S3
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.8.0 \
  --bucket velero-backups \
  --backup-location-config region=us-west-2 \
  --snapshot-location-config region=us-west-2

# Create daily backup schedule
velero schedule create daily-backup \
  --schedule="0 1 * * *" \
  --ttl 720h0m0s
```

## 📈 Performance Optimization

### 1. Resource Tuning

```yaml
# Optimized resource configuration
resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
  limits:
    memory: "1Gi"
    cpu: "500m"

# JVM tuning for Java applications
env:
- name: JAVA_OPTS
  value: "-Xms512m -Xmx1g -XX:+UseG1GC -XX:MaxGCPauseMillis=200"
```

### 2. Database Connection Pooling

```yaml
# Database connection pool configuration
env:
- name: DB_POOL_SIZE
  value: "20"
- name: DB_MAX_OVERFLOW
  value: "0"
- name: DB_POOL_TIMEOUT
  value: "30"
- name: DB_POOL_RECYCLE
  value: "3600"
```

## 🔍 Troubleshooting Guide

### Common Issues and Solutions

#### Pod Crash Loop
```bash
# Check pod logs
kubectl logs -f pod-name -n production --previous

# Check pod events
kubectl describe pod pod-name -n production

# Check resource constraints
kubectl top pods -n production
```

#### Service Discovery Issues
```bash
# Check service endpoints
kubectl get endpoints service-name -n production

# Test DNS resolution
kubectl run test-pod --rm -it --image=busybox -n production -- nslookup service-name

# Check network policies
kubectl describe networkpolicy -n production
```

#### Performance Issues
```bash
# Check resource utilization
kubectl top pods -n production
kubectl top nodes

# Check HPA status
kubectl get hpa -n production

# Check application metrics
kubectl port-forward svc/prometheus 9090:9090 -n monitoring
```

## 📊 Monitoring and Alerting

### Key Metrics to Monitor

1. **Application Metrics**
   - Request rate and latency
   - Error rate
   - Dependency health

2. **Infrastructure Metrics**
   - CPU and memory utilization
   - Network I/O
   - Storage usage

3. **Business Metrics**
   - User registration rate
   - Order completion rate
   - Revenue per minute

### Alert Rules

```yaml
# Critical alerts
- alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
  for: 5m
  labels:
    severity: critical

- alert: HighLatency
  expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
  for: 5m
  labels:
    severity: warning
```

## 🎯 Success Criteria

### Deployment Success Indicators

- ✅ All pods running and healthy
- ✅ Health checks passing
- ✅ Metrics being collected
- ✅ Logs being aggregated
- ✅ SSL certificates valid
- ✅ Autoscaling configured
- ✅ Backups scheduled
- ✅ Monitoring alerts configured

### Performance Targets

- **Availability**: 99.9% uptime
- **Response Time**: < 500ms P95
- **Error Rate**: < 0.1%
- **Recovery Time**: < 5 minutes

## 📞 Support and Maintenance

### Regular Maintenance Tasks

1. **Weekly**
   - Review monitoring dashboards
   - Check backup success
   - Update security patches

2. **Monthly**
   - Review resource utilization
   - Update dependencies
   - Conduct disaster recovery tests

3. **Quarterly**
   - Security audit
   - Performance review
   - Capacity planning

### Emergency Contacts

- **Platform Team**: platform-team@company.com
- **Security Team**: security@company.com
- **On-Call**: +1-555-0123

---

This production deployment guide provides a comprehensive framework for deploying and maintaining a enterprise-grade Kubernetes e-commerce platform. Follow the procedures systematically and customize based on your specific requirements and constraints.
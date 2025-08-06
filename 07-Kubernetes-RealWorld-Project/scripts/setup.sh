#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="${1:-local}"
CLUSTER_NAME="k8s-ecommerce"
NAMESPACE="default"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed. Please install kubectl first."
        exit 1
    fi
    
    # Check if docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if helm is installed
    if ! command -v helm &> /dev/null; then
        log_error "Helm is not installed. Please install Helm first."
        exit 1
    fi
    
    log_success "All prerequisites are installed"
}

setup_local_cluster() {
    log_info "Setting up local Kubernetes cluster..."
    
    # Check if minikube or kind is available
    if command -v minikube &> /dev/null; then
        log_info "Using Minikube for local cluster"
        
        # Start minikube if not running
        if ! minikube status &> /dev/null; then
            log_info "Starting Minikube..."
            minikube start --memory=4096 --cpus=2 --driver=docker
        fi
        
        # Enable addons
        minikube addons enable ingress
        minikube addons enable metrics-server
        
        # Use minikube docker daemon
        eval $(minikube docker-env)
        
    elif command -v kind &> /dev/null; then
        log_info "Using Kind for local cluster"
        
        # Create cluster if it doesn't exist
        if ! kind get clusters | grep -q "^${CLUSTER_NAME}$"; then
            log_info "Creating Kind cluster..."
            cat <<EOF | kind create cluster --name=${CLUSTER_NAME} --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  kubeadmConfigPatches:
  - |
    kind: InitConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        node-labels: "ingress-ready=true"
  extraPortMappings:
  - containerPort: 80
    hostPort: 80
    protocol: TCP
  - containerPort: 443
    hostPort: 443
    protocol: TCP
- role: worker
- role: worker
EOF
        fi
        
        # Set kubectl context
        kubectl cluster-info --context kind-${CLUSTER_NAME}
        
    else
        log_error "Neither minikube nor kind is available. Please install one of them."
        exit 1
    fi
    
    log_success "Local cluster is ready"
}

install_ingress_controller() {
    log_info "Installing NGINX Ingress Controller..."
    
    if [ "$ENVIRONMENT" = "local" ]; then
        if command -v minikube &> /dev/null; then
            # Minikube has ingress addon
            log_info "Ingress addon already enabled in Minikube"
        else
            # Install for kind
            kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
            
            # Wait for ingress controller to be ready
            kubectl wait --namespace ingress-nginx \
                --for=condition=ready pod \
                --selector=app.kubernetes.io/component=controller \
                --timeout=90s
        fi
    else
        # Install for cloud environments
        helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
        helm repo update
        helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
            --namespace ingress-nginx \
            --create-namespace \
            --set controller.replicaCount=2
    fi
    
    log_success "Ingress controller installed"
}

install_monitoring() {
    log_info "Installing monitoring stack..."
    
    # Add Prometheus community helm repo
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo add grafana https://grafana.github.io/helm-charts
    helm repo update
    
    # Install kube-prometheus-stack (includes Prometheus, Grafana, AlertManager)
    helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \
        --namespace monitoring \
        --create-namespace \
        --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=20Gi \
        --set grafana.adminPassword=admin123 \
        --set grafana.persistence.enabled=true \
        --set grafana.persistence.size=10Gi \
        --wait
    
    log_success "Monitoring stack installed"
}

setup_namespaces() {
    log_info "Setting up namespaces..."
    
    # Create namespaces
    kubectl create namespace ecommerce --dry-run=client -o yaml | kubectl apply -f -
    kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
    kubectl create namespace logging --dry-run=client -o yaml | kubectl apply -f -
    kubectl create namespace security --dry-run=client -o yaml | kubectl apply -f -
    
    # Label namespaces
    kubectl label namespace ecommerce environment=$ENVIRONMENT --overwrite
    kubectl label namespace monitoring environment=$ENVIRONMENT --overwrite
    kubectl label namespace logging environment=$ENVIRONMENT --overwrite
    
    log_success "Namespaces created"
}

build_docker_images() {
    log_info "Building Docker images..."
    
    # Build user service image
    docker build -t user-service:latest ./apps/user-service/
    
    # For local development, load images into cluster
    if [ "$ENVIRONMENT" = "local" ]; then
        if command -v minikube &> /dev/null; then
            # Load images into minikube
            minikube image load user-service:latest
        elif command -v kind &> /dev/null; then
            # Load images into kind
            kind load docker-image user-service:latest --name=${CLUSTER_NAME}
        fi
    fi
    
    log_success "Docker images built and loaded"
}

apply_manifests() {
    log_info "Applying Kubernetes manifests..."
    
    # Apply base manifests
    kubectl apply -f k8s-manifests/base/
    
    # Apply database manifests
    kubectl apply -f k8s-manifests/databases/
    
    # Apply monitoring manifests
    kubectl apply -f monitoring/prometheus/
    
    # Wait for deployments to be ready
    kubectl wait --for=condition=available --timeout=300s deployment/user-service
    kubectl wait --for=condition=available --timeout=300s deployment/prometheus
    
    log_success "All manifests applied successfully"
}

show_endpoints() {
    log_info "Getting service endpoints..."
    
    echo ""
    echo "🚀 Kubernetes Real-World E-Commerce Platform is ready!"
    echo ""
    echo "📊 Monitoring & Observability:"
    
    if [ "$ENVIRONMENT" = "local" ]; then
        if command -v minikube &> /dev/null; then
            echo "  Prometheus: $(minikube service prometheus --url)"
            echo "  Grafana: $(minikube service monitoring-grafana --url -n monitoring)"
        else
            echo "  Prometheus: kubectl port-forward svc/prometheus 9090:9090"
            echo "  Grafana: kubectl port-forward svc/monitoring-grafana 3000:80 -n monitoring"
        fi
    fi
    
    echo ""
    echo "🔧 Useful commands:"
    echo "  kubectl get pods -o wide"
    echo "  kubectl get services"
    echo "  kubectl logs -f deployment/user-service"
    echo "  kubectl describe pod <pod-name>"
    echo ""
    echo "🔐 Default credentials:"
    echo "  Grafana: admin / admin123"
    echo ""
}

cleanup() {
    log_info "Cleaning up resources..."
    
    if [ "$ENVIRONMENT" = "local" ]; then
        if command -v minikube &> /dev/null; then
            minikube delete
        elif command -v kind &> /dev/null; then
            kind delete cluster --name=${CLUSTER_NAME}
        fi
    else
        log_warning "Manual cleanup required for cloud environments"
        echo "Run: kubectl delete namespace ecommerce monitoring logging"
    fi
    
    log_success "Cleanup completed"
}

show_help() {
    echo "Kubernetes Real-World Project Setup Script"
    echo ""
    echo "Usage: $0 [ENVIRONMENT] [OPTIONS]"
    echo ""
    echo "Environments:"
    echo "  local       - Local development (minikube/kind)"
    echo "  development - Development cluster"
    echo "  staging     - Staging cluster"
    echo "  production  - Production cluster"
    echo ""
    echo "Options:"
    echo "  --cleanup   - Remove all resources"
    echo "  --help      - Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 local                # Setup local environment"
    echo "  $0 production          # Setup production environment"
    echo "  $0 local --cleanup     # Cleanup local environment"
}

# Main execution
main() {
    case "${2:-}" in
        --cleanup)
            cleanup
            exit 0
            ;;
        --help)
            show_help
            exit 0
            ;;
    esac
    
    log_info "Starting Kubernetes Real-World Project setup for environment: $ENVIRONMENT"
    
    check_prerequisites
    
    if [ "$ENVIRONMENT" = "local" ]; then
        setup_local_cluster
    fi
    
    setup_namespaces
    install_ingress_controller
    build_docker_images
    install_monitoring
    apply_manifests
    show_endpoints
    
    log_success "Setup completed successfully! 🎉"
}

# Execute main function
main "$@"
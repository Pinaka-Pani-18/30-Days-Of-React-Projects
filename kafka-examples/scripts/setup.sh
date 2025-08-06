#!/bin/bash

# Kafka Big Projects Setup Script
# This script sets up the complete environment for learning Kafka in big projects

set -e

echo "🚀 Setting up Kafka Big Projects Learning Environment..."

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed. Aborting." >&2; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose is required but not installed. Aborting." >&2; exit 1; }

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p monitoring/grafana-dashboards
mkdir -p monitoring/grafana-provisioning/dashboards
mkdir -p monitoring/grafana-provisioning/datasources

# Create Grafana datasource configuration
echo "📊 Setting up Grafana datasources..."
cat > monitoring/grafana-provisioning/datasources/prometheus.yml << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus:9090
    access: proxy
    isDefault: true
EOF

# Create Grafana dashboard provisioning
cat > monitoring/grafana-provisioning/dashboards/dashboard.yml << EOF
apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: ''
    folderUid: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
EOF

# Create a basic Kafka dashboard
echo "📈 Creating Kafka monitoring dashboard..."
cat > monitoring/grafana-dashboards/kafka-overview.json << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "Kafka Cluster Overview",
    "uid": "kafka-overview",
    "version": 1,
    "schemaVersion": 16,
    "type": "db",
    "tags": ["kafka"],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "10s",
    "panels": [
      {
        "id": 1,
        "title": "Messages In Per Second",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(kafka_server_brokertopicmetrics_messagesinpersec[5m])",
            "legendFormat": "{{ topic }}"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0},
        "yAxes": [
          {"label": "Messages/sec", "min": 0},
          {"show": false}
        ]
      },
      {
        "id": 2,
        "title": "Consumer Lag",
        "type": "graph",
        "targets": [
          {
            "expr": "kafka_consumer_lag_max",
            "legendFormat": "{{ group }} - {{ topic }}"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0},
        "yAxes": [
          {"label": "Messages", "min": 0},
          {"show": false}
        ]
      },
      {
        "id": 3,
        "title": "Broker Disk Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "kafka_log_size_bytes / 1024 / 1024 / 1024",
            "legendFormat": "Broker {{ broker }}"
          }
        ],
        "gridPos": {"h": 8, "w": 24, "x": 0, "y": 8},
        "yAxes": [
          {"label": "GB", "min": 0},
          {"show": false}
        ]
      }
    ]
  }
}
EOF

# Start the infrastructure
echo "🐳 Starting Docker containers..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Check if Kafka is ready
echo "🔍 Checking Kafka connectivity..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if docker-compose exec -T kafka kafka-topics.sh --bootstrap-server localhost:9092 --list >/dev/null 2>&1; then
        echo "✅ Kafka is ready!"
        break
    else
        echo "⏳ Attempt $attempt/$max_attempts: Kafka not ready yet..."
        sleep 10
        ((attempt++))
    fi
done

if [ $attempt -gt $max_attempts ]; then
    echo "❌ Kafka failed to start after $max_attempts attempts"
    exit 1
fi

# Create initial topics
echo "📝 Creating Kafka topics..."
docker-compose exec -T kafka kafka-topics.sh \
    --bootstrap-server localhost:9092 \
    --create --if-not-exists \
    --topic order-events \
    --partitions 6 \
    --replication-factor 1

docker-compose exec -T kafka kafka-topics.sh \
    --bootstrap-server localhost:9092 \
    --create --if-not-exists \
    --topic payment-events \
    --partitions 6 \
    --replication-factor 1

docker-compose exec -T kafka kafka-topics.sh \
    --bootstrap-server localhost:9092 \
    --create --if-not-exists \
    --topic user-activities \
    --partitions 12 \
    --replication-factor 1

docker-compose exec -T kafka kafka-topics.sh \
    --bootstrap-server localhost:9092 \
    --create --if-not-exists \
    --topic inventory-events \
    --partitions 6 \
    --replication-factor 1

# List created topics
echo "📋 Created topics:"
docker-compose exec -T kafka kafka-topics.sh --bootstrap-server localhost:9092 --list

# Check database connectivity
echo "🗄️  Checking database connectivity..."
if docker-compose exec -T postgres pg_isready -U kafka_user -d kafka_examples >/dev/null 2>&1; then
    echo "✅ PostgreSQL is ready!"
else
    echo "❌ PostgreSQL is not ready"
fi

# Check Redis connectivity
echo "🔴 Checking Redis connectivity..."
if docker-compose exec -T redis redis-cli ping >/dev/null 2>&1; then
    echo "✅ Redis is ready!"
else
    echo "❌ Redis is not ready"
fi

# Setup Python environment
if command -v python3 >/dev/null 2>&1; then
    echo "🐍 Setting up Python environment..."
    cd python-examples
    if command -v pip3 >/dev/null 2>&1; then
        pip3 install -r requirements.txt
        echo "✅ Python dependencies installed!"
    else
        echo "⚠️  pip3 not found, please install Python dependencies manually:"
        echo "   cd python-examples && pip install -r requirements.txt"
    fi
    cd ..
fi

# Setup Java environment
if command -v mvn >/dev/null 2>&1; then
    echo "☕ Setting up Java environment..."
    cd java-examples
    mvn dependency:resolve
    echo "✅ Java dependencies downloaded!"
    cd ..
else
    echo "⚠️  Maven not found, please install Java dependencies manually:"
    echo "   cd java-examples && mvn dependency:resolve"
fi

echo ""
echo "🎉 Setup complete! Your Kafka learning environment is ready."
echo ""
echo "🌐 Access points:"
echo "   • Kafka UI:        http://localhost:8080"
echo "   • Grafana:         http://localhost:3000 (admin/admin)"
echo "   • Prometheus:      http://localhost:9090"
echo ""
echo "🚀 Quick start:"
echo "   1. Open Kafka UI to see topics and messages: http://localhost:8080"
echo "   2. Run Python producer: cd python-examples && python3 high_throughput_producer.py"
echo "   3. Run Java examples: cd java-examples && mvn spring-boot:run"
echo "   4. Monitor in Grafana: http://localhost:3000"
echo ""
echo "📚 Next steps:"
echo "   • Read the comprehensive guide: kafka-big-projects-guide.md"
echo "   • Follow the README: README.md"
echo "   • Experiment with different scenarios"
echo ""
echo "🛑 To stop everything: docker-compose down"
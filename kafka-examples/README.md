# Kafka Big Projects: Practical Examples and Solutions

This repository contains comprehensive examples demonstrating how Apache Kafka is used in large-scale projects, the challenges you'll face, and proven solutions with real-world implementations.

## 🎯 What You'll Learn

- **Real-world Kafka challenges** in production environments
- **Proven solutions** with working code examples
- **Best practices** for large-scale deployments
- **Monitoring and troubleshooting** techniques
- **Performance optimization** strategies

## 📋 Prerequisites

- Docker and Docker Compose
- Java 17+ (for Java examples)
- Maven 3.6+ (for building Java examples)
- Basic understanding of Kafka concepts

## 🚀 Quick Start

### 1. Start the Infrastructure

```bash
# Clone and navigate to the examples directory
cd kafka-examples

# Start all services (Kafka, PostgreSQL, Redis, Monitoring)
docker-compose up -d

# Wait for services to be ready (about 2-3 minutes)
docker-compose logs -f kafka
```

### 2. Access the UIs

- **Kafka UI**: http://localhost:8080 - Browse topics, messages, consumer groups
- **Grafana**: http://localhost:3000 (admin/admin) - View Kafka metrics dashboards
- **Prometheus**: http://localhost:9090 - Raw metrics data

### 3. Build and Run Examples

```bash
# Navigate to Java examples
cd java-examples

# Build the project
mvn clean compile

# Run the e-commerce example
mvn spring-boot:run -Dspring-boot.run.profiles=demo
```

## 📊 Included Examples

### 1. E-commerce Order Processing
**File**: `java-examples/src/main/java/com/example/kafka/ecommerce/`

**Challenges Addressed**:
- Event ordering and partitioning
- Transactional outbox pattern
- Idempotent message processing
- Error handling and retries

**What it demonstrates**:
```
Order Service → [order-events] → Inventory Service
                              → Payment Service
                              → Shipping Service
```

### 2. High-Throughput Analytics Pipeline
**File**: `java-examples/src/main/java/com/example/kafka/analytics/`

**Challenges Addressed**:
- Handling millions of events per second
- Stream processing with Kafka Streams
- Real-time aggregations
- Windowing and late-arriving data

### 3. Microservices Event-Driven Architecture
**File**: `java-examples/src/main/java/com/example/kafka/microservices/`

**Challenges Addressed**:
- Service decoupling
- Saga pattern implementation
- Event sourcing
- CQRS with Kafka

## 🔧 Key Challenges and Solutions

### Challenge 1: Message Ordering
**Problem**: Maintaining event order while scaling throughput

**Solution**: Strategic partitioning
```java
// Custom partitioner ensures all events for a user go to same partition
public class UserPartitioner implements Partitioner {
    @Override
    public int partition(String topic, Object key, byte[] keyBytes, 
                        Object value, byte[] valueBytes, Cluster cluster) {
        String userId = (String) key;
        return Math.abs(userId.hashCode()) % cluster.partitionCountForTopic(topic);
    }
}
```

### Challenge 2: Exactly-Once Processing
**Problem**: Preventing duplicate processing of messages

**Solution**: Idempotent consumers with database integration
```java
@KafkaListener(topics = "payment-events")
@Transactional
public void processPayment(ConsumerRecord<String, PaymentEvent> record) {
    String idempotencyKey = generateKey(record);
    
    // Check if already processed
    if (paymentRepository.existsByIdempotencyKey(idempotencyKey)) {
        log.info("Payment already processed: {}", idempotencyKey);
        return;
    }
    
    // Process payment and store result atomically
    processAndStore(record.value(), idempotencyKey);
}
```

### Challenge 3: High Throughput and Backpressure
**Problem**: Consumer lag during traffic spikes

**Solution**: Dynamic scaling and monitoring
```java
@Component
public class ConsumerScaler {
    
    @Scheduled(fixedRate = 30000)
    public void checkAndScale() {
        long lag = kafkaMetrics.getConsumerLag("order-events");
        
        if (lag > SCALE_UP_THRESHOLD) {
            scaleUpConsumers();
        } else if (lag < SCALE_DOWN_THRESHOLD) {
            scaleDownConsumers();
        }
    }
}
```

## 📈 Monitoring and Alerting

### Key Metrics to Monitor

1. **Consumer Lag**: `kafka_consumer_lag_max`
2. **Message Rate**: `kafka_server_brokertopicmetrics_messagesinpersec`
3. **Error Rate**: `kafka_consumer_errors_total`
4. **Processing Time**: Custom application metrics

### Pre-configured Alerts

The setup includes Prometheus alerts for:
- High consumer lag (> 10,000 messages)
- Kafka leader elections
- High error rates
- Partition offline events

## 🧪 Testing Different Scenarios

### Scenario 1: High Load Testing
```bash
# Generate high load
java -jar load-generator.jar --rate=10000 --duration=300

# Monitor in Grafana dashboard
# Watch consumer lag and scaling behavior
```

### Scenario 2: Failure Recovery
```bash
# Simulate broker failure
docker-compose stop kafka

# Watch automatic failover and recovery
docker-compose start kafka
```

### Scenario 3: Schema Evolution
```bash
# Update message schema with backwards compatibility
# Deploy new version
# Verify old consumers still work
```

## 🏗️ Architecture Patterns Demonstrated

### 1. Event Sourcing
```java
@EventSourcingHandler
public class OrderProjection {
    @KafkaListener(topics = "order-events")
    public void on(OrderEvent event) {
        // Rebuild state from events
        updateOrderState(event);
    }
}
```

### 2. CQRS (Command Query Responsibility Segregation)
```java
// Command side - writes to Kafka
@RestController
public class OrderCommandController {
    @PostMapping("/orders")
    public ResponseEntity<String> createOrder(@RequestBody CreateOrderCommand cmd) {
        kafkaTemplate.send("order-commands", cmd);
        return ResponseEntity.accepted().build();
    }
}

// Query side - reads from projections
@RestController  
public class OrderQueryController {
    @GetMapping("/orders/{id}")
    public Order getOrder(@PathVariable String id) {
        return orderReadModel.findById(id);
    }
}
```

### 3. Saga Pattern
```java
@Component
public class OrderSaga {
    
    @SagaOrchestrationStart
    @KafkaListener(topics = "order-created")
    public void startOrderProcessing(OrderCreatedEvent event) {
        // Step 1: Reserve inventory
        publishCommand(new ReserveInventoryCommand(event.getOrderId()));
    }
    
    @SagaOrchestrationContinue
    @KafkaListener(topics = "inventory-reserved") 
    public void onInventoryReserved(InventoryReservedEvent event) {
        // Step 2: Process payment
        publishCommand(new ProcessPaymentCommand(event.getOrderId()));
    }
    
    // Handle failures and compensation
    @SagaOrchestrationContinue
    @KafkaListener(topics = "payment-failed")
    public void onPaymentFailed(PaymentFailedEvent event) {
        // Compensate: Release inventory
        publishCommand(new ReleaseInventoryCommand(event.getOrderId()));
    }
}
```

## 📚 Additional Resources

### Configuration Examples
- `docker-compose.yml` - Complete infrastructure setup
- `monitoring/prometheus.yml` - Metrics collection
- `monitoring/grafana-dashboards/` - Pre-built dashboards

### Best Practices Guide
See `kafka-big-projects-guide.md` for comprehensive best practices covering:
- Cluster configuration
- Producer/Consumer optimization
- Error handling strategies
- Performance tuning
- Security considerations

## 🐛 Troubleshooting

### Common Issues

1. **Consumer Lag Building Up**
   ```bash
   # Check consumer group status
   kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group payment-service-group
   
   # Scale up consumers
   kubectl scale deployment payment-service --replicas=5
   ```

2. **Messages Not Being Processed**
   ```bash
   # Check topic configuration
   kafka-topics.sh --bootstrap-server localhost:9092 --describe --topic order-events
   
   # Verify consumer group assignment
   docker-compose logs payment-service
   ```

3. **High Memory Usage**
   ```bash
   # Check JVM heap usage
   docker-compose exec kafka jcmd 1 GC.run
   
   # Tune JVM settings in docker-compose.yml
   ```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Add tests for your changes
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎓 Learning Path

1. **Start with the basics** - Read the comprehensive guide
2. **Run the examples** - Follow the quick start guide
3. **Experiment** - Modify configurations and observe behavior
4. **Monitor** - Use Grafana dashboards to understand metrics
5. **Scale** - Test with high load and multiple consumers
6. **Troubleshoot** - Simulate failures and practice recovery

## 💡 Next Steps

After mastering these examples:
- Implement your own use case
- Add security (SSL, SASL)
- Explore Kafka Connect for data integration
- Try Kafka Streams for complex stream processing
- Implement multi-datacenter replication

---

**Happy Kafka Learning!** 🚀

For questions or issues, please open a GitHub issue or reach out to the community.
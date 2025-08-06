package com.example.kafka.ecommerce;

import com.example.kafka.ecommerce.model.OrderEvent;
import com.example.kafka.ecommerce.model.OrderStatus;
import com.example.kafka.ecommerce.model.ProcessedPayment;
import com.example.kafka.ecommerce.repository.ProcessedPaymentRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.concurrent.CompletableFuture;

/**
 * Payment Service demonstrating idempotent message processing
 * Challenges addressed:
 * 1. Exactly-once processing semantics
 * 2. Idempotency with database integration
 * 3. Retry and error handling
 * 4. Metrics and monitoring
 */
@Service
public class PaymentService {
    
    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);
    
    @Autowired
    private ProcessedPaymentRepository paymentRepository;
    
    @Autowired
    private KafkaTemplate<String, String> kafkaTemplate;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @Autowired
    private PaymentGateway paymentGateway;
    
    // Metrics
    private final Counter paymentProcessedCounter;
    private final Counter paymentFailedCounter;
    private final Counter duplicatePaymentCounter;
    private final Timer paymentProcessingTimer;
    
    public PaymentService(MeterRegistry meterRegistry) {
        this.paymentProcessedCounter = Counter.builder("payment.processed")
            .description("Number of payments processed")
            .register(meterRegistry);
        
        this.paymentFailedCounter = Counter.builder("payment.failed")
            .description("Number of payment failures")
            .register(meterRegistry);
        
        this.duplicatePaymentCounter = Counter.builder("payment.duplicate")
            .description("Number of duplicate payment attempts")
            .register(meterRegistry);
        
        this.paymentProcessingTimer = Timer.builder("payment.processing.time")
            .description("Payment processing time")
            .register(meterRegistry);
    }
    
    /**
     * Processes order events and handles payment
     * Implements idempotent processing to prevent duplicate charges
     */
    @KafkaListener(
        topics = "order-events",
        groupId = "payment-service-group",
        containerFactory = "kafkaListenerContainerFactory"
    )
    @Transactional
    public void processOrderEvent(ConsumerRecord<String, String> record) {
        
        Timer.Sample sample = Timer.start();
        
        try {
            OrderEvent orderEvent = objectMapper.readValue(record.value(), OrderEvent.class);
            
            // Only process CREATED orders
            if (orderEvent.getStatus() != OrderStatus.CREATED) {
                log.debug("Ignoring order event with status: {}", orderEvent.getStatus());
                return;
            }
            
            log.info("Processing payment for order: {}", orderEvent.getOrderId());
            
            // Create idempotency key from Kafka metadata
            String idempotencyKey = generateIdempotencyKey(record);
            
            // Check if payment already processed (idempotency check)
            if (paymentRepository.existsByIdempotencyKey(idempotencyKey)) {
                log.info("Payment already processed for order: {} (key: {})", 
                    orderEvent.getOrderId(), idempotencyKey);
                duplicatePaymentCounter.increment();
                return;
            }
            
            // Process payment
            PaymentResult result = processPayment(orderEvent, idempotencyKey);
            
            // Store payment result
            ProcessedPayment processedPayment = new ProcessedPayment();
            processedPayment.setIdempotencyKey(idempotencyKey);
            processedPayment.setOrderId(orderEvent.getOrderId());
            processedPayment.setAmount(orderEvent.getTotalAmount());
            processedPayment.setStatus(result.isSuccessful() ? "SUCCESS" : "FAILED");
            processedPayment.setPaymentMethod(result.getPaymentMethod());
            processedPayment.setProcessedAt(Instant.now());
            
            paymentRepository.save(processedPayment);
            
            // Publish payment result event
            publishPaymentEvent(orderEvent.getOrderId(), result);
            
            if (result.isSuccessful()) {
                paymentProcessedCounter.increment();
                log.info("Payment successful for order: {}", orderEvent.getOrderId());
            } else {
                paymentFailedCounter.increment();
                log.warn("Payment failed for order: {} - {}", 
                    orderEvent.getOrderId(), result.getErrorMessage());
            }
            
        } catch (Exception e) {
            paymentFailedCounter.increment();
            log.error("Error processing payment for record: {} partition: {} offset: {}", 
                record.key(), record.partition(), record.offset(), e);
            
            // Re-throw to trigger retry or send to DLQ
            throw new PaymentProcessingException("Failed to process payment", e);
        } finally {
            sample.stop(paymentProcessingTimer);
        }
    }
    
    /**
     * Generates idempotency key from Kafka record metadata
     * This ensures the same message is never processed twice
     */
    private String generateIdempotencyKey(ConsumerRecord<String, String> record) {
        return String.format("%s-%d-%d", 
            record.topic(), record.partition(), record.offset());
    }
    
    /**
     * Processes the actual payment through payment gateway
     */
    private PaymentResult processPayment(OrderEvent orderEvent, String idempotencyKey) {
        try {
            // Simulate payment processing
            PaymentRequest paymentRequest = new PaymentRequest(
                orderEvent.getCustomerId(),
                orderEvent.getTotalAmount(),
                "credit_card",
                idempotencyKey
            );
            
            return paymentGateway.processPayment(paymentRequest);
            
        } catch (PaymentGatewayException e) {
            log.error("Payment gateway error for order: {}", orderEvent.getOrderId(), e);
            return new PaymentResult(false, null, e.getMessage());
        }
    }
    
    /**
     * Publishes payment result event
     */
    private void publishPaymentEvent(String orderId, PaymentResult result) {
        try {
            PaymentEvent paymentEvent = new PaymentEvent(
                orderId,
                result.isSuccessful() ? "COMPLETED" : "FAILED",
                result.getTransactionId(),
                result.getErrorMessage(),
                Instant.now()
            );
            
            String eventJson = objectMapper.writeValueAsString(paymentEvent);
            
            CompletableFuture<org.springframework.kafka.support.SendResult<String, String>> future = 
                kafkaTemplate.send("payment-events", orderId, eventJson);
            
            future.whenComplete((sendResult, ex) -> {
                if (ex != null) {
                    log.error("Failed to publish payment event for order: {}", orderId, ex);
                } else {
                    log.info("Published payment event for order: {}", orderId);
                }
            });
            
        } catch (Exception e) {
            log.error("Failed to serialize payment event for order: {}", orderId, e);
        }
    }
    
    /**
     * Payment processing classes
     */
    public static class PaymentRequest {
        private final String customerId;
        private final BigDecimal amount;
        private final String paymentMethod;
        private final String idempotencyKey;
        
        public PaymentRequest(String customerId, BigDecimal amount, 
                            String paymentMethod, String idempotencyKey) {
            this.customerId = customerId;
            this.amount = amount;
            this.paymentMethod = paymentMethod;
            this.idempotencyKey = idempotencyKey;
        }
        
        // Getters
        public String getCustomerId() { return customerId; }
        public BigDecimal getAmount() { return amount; }
        public String getPaymentMethod() { return paymentMethod; }
        public String getIdempotencyKey() { return idempotencyKey; }
    }
    
    public static class PaymentResult {
        private final boolean successful;
        private final String transactionId;
        private final String errorMessage;
        private final String paymentMethod = "credit_card";
        
        public PaymentResult(boolean successful, String transactionId, String errorMessage) {
            this.successful = successful;
            this.transactionId = transactionId;
            this.errorMessage = errorMessage;
        }
        
        // Getters
        public boolean isSuccessful() { return successful; }
        public String getTransactionId() { return transactionId; }
        public String getErrorMessage() { return errorMessage; }
        public String getPaymentMethod() { return paymentMethod; }
    }
    
    public static class PaymentEvent {
        private String orderId;
        private String status;
        private String transactionId;
        private String errorMessage;
        private Instant timestamp;
        
        public PaymentEvent() {}
        
        public PaymentEvent(String orderId, String status, String transactionId, 
                          String errorMessage, Instant timestamp) {
            this.orderId = orderId;
            this.status = status;
            this.transactionId = transactionId;
            this.errorMessage = errorMessage;
            this.timestamp = timestamp;
        }
        
        // Getters and setters
        public String getOrderId() { return orderId; }
        public void setOrderId(String orderId) { this.orderId = orderId; }
        
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        
        public String getTransactionId() { return transactionId; }
        public void setTransactionId(String transactionId) { this.transactionId = transactionId; }
        
        public String getErrorMessage() { return errorMessage; }
        public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
        
        public Instant getTimestamp() { return timestamp; }
        public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
    }
    
    /**
     * Exception classes
     */
    public static class PaymentProcessingException extends RuntimeException {
        public PaymentProcessingException(String message, Throwable cause) {
            super(message, cause);
        }
    }
    
    public static class PaymentGatewayException extends Exception {
        public PaymentGatewayException(String message) {
            super(message);
        }
    }
}

/**
 * Simulated Payment Gateway for demonstration
 */
@Service
class PaymentGateway {
    
    private static final Logger log = LoggerFactory.getLogger(PaymentGateway.class);
    
    public PaymentService.PaymentResult processPayment(PaymentService.PaymentRequest request) 
            throws PaymentService.PaymentGatewayException {
        
        log.info("Processing payment for customer: {} amount: {}", 
            request.getCustomerId(), request.getAmount());
        
        // Simulate processing time
        try {
            Thread.sleep(100);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        
        // Simulate 10% failure rate
        if (Math.random() < 0.1) {
            throw new PaymentService.PaymentGatewayException("Insufficient funds");
        }
        
        // Generate transaction ID
        String transactionId = "TXN_" + System.currentTimeMillis();
        
        return new PaymentService.PaymentResult(true, transactionId, null);
    }
}
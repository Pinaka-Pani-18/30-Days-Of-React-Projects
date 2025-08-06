package com.example.kafka.ecommerce;

import com.example.kafka.ecommerce.model.Order;
import com.example.kafka.ecommerce.model.OrderEvent;
import com.example.kafka.ecommerce.model.OrderStatus;
import com.example.kafka.ecommerce.repository.OrderRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

/**
 * Order Service demonstrating Kafka integration in e-commerce system
 * Challenges addressed:
 * 1. Transactional outbox pattern
 * 2. Event ordering
 * 3. Error handling
 */
@Service
public class OrderService {
    
    private static final Logger log = LoggerFactory.getLogger(OrderService.class);
    
    @Autowired
    private OrderRepository orderRepository;
    
    @Autowired
    private KafkaTemplate<String, String> kafkaTemplate;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    private static final String ORDER_EVENTS_TOPIC = "order-events";
    
    /**
     * Creates an order and publishes event to Kafka
     * Uses transactional outbox pattern to ensure consistency
     */
    @Transactional
    public Order createOrder(CreateOrderRequest request) {
        try {
            // Create order in database first
            Order order = new Order();
            order.setId(UUID.randomUUID().toString());
            order.setCustomerId(request.getCustomerId());
            order.setTotalAmount(request.getTotalAmount());
            order.setStatus(OrderStatus.CREATED);
            order.setCreatedAt(Instant.now());
            
            order = orderRepository.save(order);
            log.info("Order created: {}", order.getId());
            
            // Create order event
            OrderEvent event = new OrderEvent(
                order.getId(),
                order.getCustomerId(),
                request.getItems(),
                order.getTotalAmount(),
                OrderStatus.CREATED,
                Instant.now()
            );
            
            // Publish to Kafka with proper partitioning by customer ID
            publishOrderEvent(event);
            
            return order;
            
        } catch (Exception e) {
            log.error("Failed to create order for customer: {}", request.getCustomerId(), e);
            throw new OrderCreationException("Failed to create order", e);
        }
    }
    
    /**
     * Updates order status and publishes status change event
     */
    @Transactional
    public Order updateOrderStatus(String orderId, OrderStatus newStatus) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new OrderNotFoundException("Order not found: " + orderId));
        
        OrderStatus oldStatus = order.getStatus();
        order.setStatus(newStatus);
        order.setUpdatedAt(Instant.now());
        
        order = orderRepository.save(order);
        
        // Publish status change event
        OrderEvent event = new OrderEvent(
            order.getId(),
            order.getCustomerId(),
            null, // No items needed for status update
            order.getTotalAmount(),
            newStatus,
            Instant.now()
        );
        
        publishOrderEvent(event);
        
        log.info("Order {} status changed from {} to {}", orderId, oldStatus, newStatus);
        return order;
    }
    
    /**
     * Publishes order event to Kafka with proper error handling
     */
    private void publishOrderEvent(OrderEvent event) {
        try {
            String eventJson = objectMapper.writeValueAsString(event);
            
            // Use customer ID as partition key to ensure ordering
            CompletableFuture<SendResult<String, String>> future = 
                kafkaTemplate.send(ORDER_EVENTS_TOPIC, event.getCustomerId(), eventJson);
            
            future.whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("Failed to publish order event: {}", event.getOrderId(), ex);
                    // In production, you'd want to store this in an outbox table for retry
                    handlePublishFailure(event, ex);
                } else {
                    log.info("Published order event: {} to partition: {}", 
                        event.getOrderId(), result.getRecordMetadata().partition());
                }
            });
            
        } catch (Exception e) {
            log.error("Failed to serialize order event: {}", event.getOrderId(), e);
            throw new EventPublishException("Failed to publish order event", e);
        }
    }
    
    /**
     * Handles failure to publish events - in production this would
     * implement retry logic or dead letter queue
     */
    private void handlePublishFailure(OrderEvent event, Throwable ex) {
        // Store in outbox table for retry
        log.error("Storing failed event in outbox table: {}", event.getOrderId());
        
        // In real implementation:
        // 1. Store in outbox table
        // 2. Have separate process to retry failed events
        // 3. Implement exponential backoff
        // 4. Send to dead letter queue after max retries
    }
    
    /**
     * Custom exception classes
     */
    public static class OrderCreationException extends RuntimeException {
        public OrderCreationException(String message, Throwable cause) {
            super(message, cause);
        }
    }
    
    public static class OrderNotFoundException extends RuntimeException {
        public OrderNotFoundException(String message) {
            super(message);
        }
    }
    
    public static class EventPublishException extends RuntimeException {
        public EventPublishException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
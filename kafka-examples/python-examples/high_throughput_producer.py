#!/usr/bin/env python3
"""
High-Throughput Kafka Producer Example
Demonstrates handling millions of messages per second with Python

Challenges addressed:
1. Batch processing for maximum throughput
2. Asynchronous message sending
3. Error handling and retries
4. Backpressure management
5. Metrics and monitoring
"""

import asyncio
import json
import logging
import time
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Dict, List, Optional
import uuid

from kafka import KafkaProducer
from kafka.errors import KafkaError
import concurrent.futures
import threading
from queue import Queue, Empty
import signal
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@dataclass
class UserActivity:
    """User activity event for analytics pipeline"""
    user_id: str
    session_id: str
    event_type: str
    timestamp: datetime
    properties: Dict
    page_url: Optional[str] = None
    referrer: Optional[str] = None
    user_agent: Optional[str] = None

class HighThroughputProducer:
    """
    High-performance Kafka producer designed for handling
    millions of messages per second in big data scenarios
    """
    
    def __init__(self, bootstrap_servers: str = 'localhost:9092', 
                 topic: str = 'user-activities'):
        self.bootstrap_servers = bootstrap_servers
        self.topic = topic
        self.running = False
        self.stats = {
            'messages_sent': 0,
            'messages_failed': 0,
            'bytes_sent': 0,
            'last_throughput': 0
        }
        self.stats_lock = threading.Lock()
        
        # Producer configuration optimized for high throughput
        self.producer = KafkaProducer(
            bootstrap_servers=bootstrap_servers,
            
            # Serialization
            key_serializer=lambda x: x.encode('utf-8') if x else None,
            value_serializer=lambda x: json.dumps(x).encode('utf-8'),
            
            # Performance tuning
            batch_size=65536,  # 64KB batches
            linger_ms=5,       # Wait up to 5ms to batch messages
            compression_type='snappy',  # Fast compression
            buffer_memory=67108864,     # 64MB buffer
            
            # Reliability vs Performance trade-off
            acks=1,  # Wait for leader acknowledgment only
            retries=3,
            retry_backoff_ms=1000,
            
            # Timeouts
            request_timeout_ms=30000,
            delivery_timeout_ms=120000,
            
            # Connection pooling
            max_in_flight_requests_per_connection=10,
            
            # Error handling
            enable_idempotence=True  # Prevent duplicates
        )
        
        # Message queue for batching
        self.message_queue = Queue(maxsize=100000)
        self.batch_processor = None
        
    def start(self):
        """Start the producer and background processing"""
        self.running = True
        
        # Start batch processor thread
        self.batch_processor = threading.Thread(
            target=self._process_message_batches,
            daemon=True
        )
        self.batch_processor.start()
        
        # Start stats reporter thread
        self.stats_reporter = threading.Thread(
            target=self._report_stats,
            daemon=True
        )
        self.stats_reporter.start()
        
        logger.info("High-throughput producer started")
    
    def stop(self):
        """Gracefully stop the producer"""
        logger.info("Stopping producer...")
        self.running = False
        
        # Wait for queue to drain
        while not self.message_queue.empty():
            time.sleep(0.1)
        
        if self.batch_processor:
            self.batch_processor.join(timeout=10)
        
        # Flush remaining messages
        self.producer.flush(timeout=30)
        self.producer.close()
        
        logger.info("Producer stopped. Final stats: %s", self.stats)
    
    def send_activity(self, activity: UserActivity) -> bool:
        """
        Send a user activity event (non-blocking)
        Returns True if queued successfully, False if queue is full
        """
        try:
            # Convert to dict for JSON serialization
            activity_dict = asdict(activity)
            activity_dict['timestamp'] = activity.timestamp.isoformat()
            
            # Use user_id as partition key for ordering
            partition_key = activity.user_id
            
            # Queue the message for batch processing
            self.message_queue.put_nowait((partition_key, activity_dict))
            return True
            
        except Exception as e:
            logger.error(f"Failed to queue activity: {e}")
            return False
    
    def _process_message_batches(self):
        """Background thread that processes messages in batches"""
        batch = []
        batch_size = 1000  # Process 1000 messages at a time
        
        while self.running or not self.message_queue.empty():
            try:
                # Collect batch of messages
                while len(batch) < batch_size and self.running:
                    try:
                        message = self.message_queue.get(timeout=0.1)
                        batch.append(message)
                    except Empty:
                        break
                
                if batch:
                    self._send_batch(batch)
                    batch = []
                    
            except Exception as e:
                logger.error(f"Error in batch processor: {e}")
                time.sleep(1)  # Backoff on error
    
    def _send_batch(self, batch: List[tuple]):
        """Send a batch of messages asynchronously"""
        futures = []
        
        for partition_key, message in batch:
            try:
                # Send message asynchronously
                future = self.producer.send(
                    self.topic,
                    key=partition_key,
                    value=message
                )
                
                # Add callback for success/failure tracking
                future.add_callback(self._on_send_success, message)
                future.add_errback(self._on_send_error, message)
                
                futures.append(future)
                
            except Exception as e:
                logger.error(f"Failed to send message: {e}")
                self._update_stats(failed=1)
        
        # Optional: Wait for batch completion (reduces throughput but increases reliability)
        # for future in futures:
        #     try:
        #         future.get(timeout=1)
        #     except Exception as e:
        #         logger.error(f"Message send failed: {e}")
    
    def _on_send_success(self, record_metadata, message):
        """Callback for successful message send"""
        message_size = len(json.dumps(message).encode('utf-8'))
        self._update_stats(sent=1, bytes_sent=message_size)
    
    def _on_send_error(self, exception, message):
        """Callback for failed message send"""
        logger.error(f"Message send failed: {exception}")
        self._update_stats(failed=1)
    
    def _update_stats(self, sent=0, failed=0, bytes_sent=0):
        """Thread-safe stats update"""
        with self.stats_lock:
            self.stats['messages_sent'] += sent
            self.stats['messages_failed'] += failed
            self.stats['bytes_sent'] += bytes_sent
    
    def _report_stats(self):
        """Background thread that reports throughput stats"""
        last_sent = 0
        
        while self.running:
            time.sleep(10)  # Report every 10 seconds
            
            with self.stats_lock:
                current_sent = self.stats['messages_sent']
                throughput = (current_sent - last_sent) / 10  # messages per second
                self.stats['last_throughput'] = throughput
                last_sent = current_sent
                
                logger.info(
                    f"Throughput: {throughput:.1f} msg/s | "
                    f"Total sent: {current_sent:,} | "
                    f"Failed: {self.stats['messages_failed']:,} | "
                    f"Queue size: {self.message_queue.qsize():,}"
                )

class ActivityGenerator:
    """Generates realistic user activity data for testing"""
    
    def __init__(self):
        self.event_types = [
            'page_view', 'click', 'form_submit', 'video_play', 
            'purchase', 'add_to_cart', 'search', 'scroll'
        ]
        self.pages = [
            '/home', '/products', '/checkout', '/profile', 
            '/search', '/category/electronics', '/category/books'
        ]
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
        ]
    
    def generate_activity(self, user_id: str = None) -> UserActivity:
        """Generate a random user activity"""
        if not user_id:
            user_id = f"user_{uuid.uuid4().hex[:8]}"
        
        return UserActivity(
            user_id=user_id,
            session_id=f"sess_{uuid.uuid4().hex[:12]}",
            event_type=self.event_types[int(time.time() * 1000) % len(self.event_types)],
            timestamp=datetime.now(),
            properties={
                'product_id': f"prod_{uuid.uuid4().hex[:6]}",
                'category': 'electronics',
                'price': round(10.0 + (hash(user_id) % 1000), 2),
                'discount': 0.1 if hash(user_id) % 10 == 0 else 0.0
            },
            page_url=self.pages[hash(user_id) % len(self.pages)],
            referrer='https://google.com',
            user_agent=self.user_agents[hash(user_id) % len(self.user_agents)]
        )

def load_test(producer: HighThroughputProducer, 
              target_rate: int = 10000, 
              duration: int = 300):
    """
    Load test the producer with specified rate and duration
    
    Args:
        producer: The Kafka producer instance
        target_rate: Target messages per second
        duration: Test duration in seconds
    """
    generator = ActivityGenerator()
    start_time = time.time()
    messages_sent = 0
    
    logger.info(f"Starting load test: {target_rate} msg/s for {duration}s")
    
    # Calculate sleep time between messages
    sleep_time = 1.0 / target_rate if target_rate > 0 else 0
    
    while time.time() - start_time < duration:
        batch_start = time.time()
        
        # Send a batch of messages
        batch_size = min(target_rate // 10, 1000)  # 100ms worth of messages
        
        for _ in range(batch_size):
            activity = generator.generate_activity()
            
            # Try to send, handle backpressure
            if not producer.send_activity(activity):
                logger.warning("Producer queue full, backing off...")
                time.sleep(0.01)  # Back off when queue is full
                continue
            
            messages_sent += 1
        
        # Rate limiting
        batch_time = time.time() - batch_start
        target_batch_time = batch_size * sleep_time
        
        if batch_time < target_batch_time:
            time.sleep(target_batch_time - batch_time)
    
    logger.info(f"Load test completed. Sent {messages_sent:,} messages")

def signal_handler(signum, frame):
    """Handle shutdown signals gracefully"""
    logger.info("Received shutdown signal, stopping...")
    sys.exit(0)

def main():
    """Main function demonstrating high-throughput production"""
    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Create and start producer
    producer = HighThroughputProducer()
    
    try:
        producer.start()
        
        # Run load test
        # Scenario 1: Moderate load (1K msg/s for 5 minutes)
        logger.info("=== Scenario 1: Moderate Load ===")
        load_test(producer, target_rate=1000, duration=300)
        
        time.sleep(10)  # Cool down
        
        # Scenario 2: High load (10K msg/s for 2 minutes)
        logger.info("=== Scenario 2: High Load ===")
        load_test(producer, target_rate=10000, duration=120)
        
        time.sleep(10)  # Cool down
        
        # Scenario 3: Burst load (50K msg/s for 30 seconds)
        logger.info("=== Scenario 3: Burst Load ===")
        load_test(producer, target_rate=50000, duration=30)
        
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
    except Exception as e:
        logger.error(f"Error in main: {e}")
    finally:
        producer.stop()

if __name__ == "__main__":
    main()
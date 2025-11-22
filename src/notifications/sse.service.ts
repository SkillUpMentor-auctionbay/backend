import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { NotificationDto } from './dto/notification.dto';
import { LoggingService } from '../common/services/logging.service';

export interface SseConnection {
  userId: string;
  response: any;
  isConnected: boolean;
}

@Injectable()
export class SseService {
  private connections: Map<string, SseConnection[]> = new Map();
  private notificationSubject = new Subject<{ userId: string; notification: NotificationDto }>();
  private logger = new Logger(SseService.name);

  constructor(private loggingService: LoggingService) {}

  /**
   * Add a new SSE connection for a user
   */
  addConnection(userId: string, response: any): void {
    this.loggingService.logInfo('Adding SSE connection', { userId });

    const connection: SseConnection = {
      userId,
      response,
      isConnected: true,
    };

    if (!this.connections.has(userId)) {
      this.connections.set(userId, []);
    }

    this.connections.get(userId)!.push(connection);

    // Send initial connection event
    this.sendToConnection(connection, {
      event: 'connected',
      data: { message: 'Connected to notifications stream', timestamp: new Date().toISOString() },
    });

    this.logger.log(`SSE connection added for user ${userId}. Total connections: ${this.connections.get(userId)?.length}`);
  }

  /**
   * Remove an SSE connection
   */
  removeConnection(userId: string, response: any): void {
    this.loggingService.logInfo('Removing SSE connection', { userId });

    const userConnections = this.connections.get(userId);
    if (userConnections) {
      const index = userConnections.findIndex(conn => conn.response === response);
      if (index !== -1) {
        userConnections[index].isConnected = false;
        userConnections.splice(index, 1);

        if (userConnections.length === 0) {
          this.connections.delete(userId);
        }
      }
    }

    this.logger.log(`SSE connection removed for user ${userId}. Total connections: ${this.connections.get(userId)?.length || 0}`);
  }

  /**
   * Broadcast a notification to a specific user
   */
  broadcastNotification(userId: string, notification: NotificationDto): void {
    console.log('📢 SSE Broadcast called for user:', userId, 'notification:', notification.id);
    console.log('📊 Active connections count:', this.getTotalConnections());
    console.log('👤 User specific connections:', this.getConnectionCount(userId));

    this.loggingService.logInfo('Broadcasting notification via SSE', {
      userId,
      notificationId: notification.id,
      type: notification.price ? 'won' : 'outbid',
    });

    // Check if user has active connections
    const userConnections = this.connections.get(userId);
    const connectionCount = userConnections ? userConnections.length : 0;
    console.log('🔗 User connections found:', connectionCount, 'for user:', userId);

    // Emit to the subject for SSE streaming
    this.notificationSubject.next({ userId, notification });
    console.log('✅ Notification emitted to subject');

    // Also directly send to connected clients
    this.sendToUserConnections(userId, {
      event: 'notification',
      data: notification,
    });
    console.log('✅ Direct send to connections completed');
  }

  /**
   * Get observable stream for a user's notifications
   */
  getNotificationStream(userId: string): Observable<{ userId: string; notification: NotificationDto }> {
    return this.notificationSubject.asObservable().pipe(filter(event => event.userId === userId));
  }

  /**
   * Send data to a specific connection
   */
  private sendToConnection(connection: SseConnection, data: any): void {
    console.log('📡 sendToConnection called for user:', connection.userId, 'isConnected:', connection.isConnected);

    if (!connection.isConnected) {
      console.log('❌ Connection not active, skipping:', connection.userId);
      return;
    }

    try {
      console.log('📝 Preparing SSE data for user:', connection.userId);
      console.log('📦 Final SSE payload:', JSON.stringify(data, null, 2));

      if (data.event) {
        connection.response.write(`event: ${data.event}\n`);
        console.log('✅ Event written:', data.event);
      }

      const dataString = JSON.stringify(data.data);
      console.log('📄 Data string to write:', dataString);
      connection.response.write(`data: ${dataString}\n\n`);
      console.log('✅ Data written successfully for user:', connection.userId);

      // Force flush the response to ensure immediate delivery
      connection.response.flush && connection.response.flush();
      console.log('🚀 Response flushed for user:', connection.userId);

    } catch (error) {
      console.log('💥 Failed to send SSE data for user:', connection.userId, error);
      this.loggingService.logError('Failed to send SSE data', error as Error, {
        userId: connection.userId,
      });
      // Mark connection as disconnected
      connection.isConnected = false;
    }
  }

  /**
   * Send data to all connections for a specific user
   */
  private sendToUserConnections(userId: string, data: any): void {
    console.log('📡 sendToUserConnections called for user:', userId);
    console.log('📦 Data to send:', JSON.stringify(data, null, 2));

    const userConnections = this.connections.get(userId);
    if (!userConnections) {
      console.log('❌ No connections found for user:', userId);
      console.log('👥 Currently connected users:', Array.from(this.connections.keys()));
      return;
    }

    console.log('🔗 Found', userConnections.length, 'connections for user:', userId);

    // Handle different data formats:
    // - If data has .event and .data properties, use as-is
    // - If data is a notification object, wrap it properly
    let ssePayload = data;
    if (!data.event && !data.data) {
      // This is a raw notification, wrap it for SSE
      ssePayload = {
        event: 'notification',
        data: data
      };
    }

    console.log('🎯 Final SSE payload:', JSON.stringify(ssePayload, null, 2));

    userConnections.forEach((connection, index) => {
      console.log(`📤 Sending to connection ${index}:`, {
        isConnected: connection.isConnected,
        userId: connection.userId
      });
      this.sendToConnection(connection, ssePayload);
    });
    console.log('✅ All connections processed for user:', userId);
  }

  /**
   * Get active connection count for a user
   */
  getConnectionCount(userId: string): number {
    const userConnections = this.connections.get(userId);
    return userConnections ? userConnections.filter(conn => conn.isConnected).length : 0;
  }

  /**
   * Get total active connections
   */
  getTotalConnections(): number {
    let total = 0;
    this.connections.forEach(userConnections => {
      total += userConnections.filter(conn => conn.isConnected).length;
    });
    return total;
  }
}
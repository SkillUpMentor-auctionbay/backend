import { Injectable } from '@nestjs/common';
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
  private readonly connections: Map<string, SseConnection[]> = new Map();
  private readonly notificationSubject = new Subject<{ userId: string; notification: NotificationDto }>();

  constructor(private readonly loggingService: LoggingService) {}

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

    this.connections.get(userId).push(connection);

    this.sendToConnection(connection, {
      event: 'connected',
      data: { message: 'Connected to notifications stream', timestamp: new Date().toISOString() },
    });

    this.loggingService.logInfo('SSE connection added for user', {
      userId,
      totalConnections: this.connections.get(userId)?.length || 0,
    });
  }


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

    this.loggingService.logInfo('SSE connection removed for user', {
      userId,
      totalConnections: this.connections.get(userId)?.length || 0,
    });
  }


  broadcastNotification(userId: string, notification: NotificationDto): void {
    this.loggingService.logInfo('Broadcasting notification via SSE', {
      userId,
      notificationId: notification.id,
      type: notification.price ? 'won' : 'outbid',
    });

    const standardizedEvent = {
      userId,
      notification,
      timestamp: new Date().toISOString(),
      eventType: notification.price ? 'auction_won' : 'outbid'
    };

    this.notificationSubject.next(standardizedEvent);

    this.sendToUserConnections(userId, {
      event: 'notification',
      data: standardizedEvent
    });
  }


  getNotificationStream(userId: string): Observable<{ userId: string; notification: NotificationDto }> {
    return this.notificationSubject.asObservable().pipe(filter(event => event.userId === userId));
  }


  private sendToConnection(connection: SseConnection, data: any): void {
    if (!connection.isConnected) {
      return;
    }

    try {
      if (data.event) {
        connection.response.write(`event: ${data.event}\n`);
      }

      const dataString = JSON.stringify(data.data);
      connection.response.write(`data: ${dataString}\n\n`);

      connection.response.flush && connection.response.flush();

    } catch (error) {
      this.loggingService.logError('Failed to send SSE data', error as Error, {
        userId: connection.userId,
      });
      connection.isConnected = false;
    }
  }


  private sendToUserConnections(userId: string, data: any): void {
    const userConnections = this.connections.get(userId);
    if (!userConnections) {
      return;
    }

    let ssePayload = data;

    if (!data.event || !data.data) {
      ssePayload = {
        event: 'notification',
        data: {
          userId,
          notification: data.notification || data,
          timestamp: new Date().toISOString(),
          eventType: (data.notification?.price || data?.price) ? 'auction_won' : 'outbid'
        }
      };
    }

    userConnections.forEach((connection) => {
      this.sendToConnection(connection, ssePayload);
    });
  }


  getConnectionCount(userId: string): number {
    const userConnections = this.connections.get(userId);
    return userConnections ? userConnections.filter(conn => conn.isConnected).length : 0;
  }


  getTotalConnections(): number {
    let total = 0;
    this.connections.forEach(userConnections => {
      total += userConnections.filter(conn => conn.isConnected).length;
    });
    return total;
  }
}
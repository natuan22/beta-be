import { CACHE_MANAGER, Inject, Logger, UseFilters } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Cache } from 'cache-manager';
import { Server, Socket } from 'socket.io';
import { CatchSocketException } from '../exceptions/socket.exception';
import { SocketErrorFilter } from '../filters/socket-error.filter';
import { SocketService } from './socket.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'socket',
  transports: ['websocket', 'polling'],
})
@UseFilters(SocketErrorFilter)
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  logger = new Logger('SocketLogger');
  @WebSocketServer() server: Server;

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly redis: Cache,
    private readonly socketService: SocketService
  ) {}
  
  afterInit(server: any) {
    this.logger.log('Server Init!');
    global._server = this.server;
  }

  handleConnection(client: Socket) {
    try {
      const token: string = client.handshake.headers.authorization;
      client.data.token = token;
      this.logger.log(client.id + ' Connected!');
    } catch (e) {
      client.disconnect();
      throw new CatchSocketException(e);
    }
  }

  async handleDisconnect(client: any) {
    this.logger.log(`${client.id} Disconnected!`);

    const clients: string[] = await this.redis.get('clients');

    if (Array.isArray(clients)) {
      const updatedClients = clients.filter(id => id !== client.id);

      await this.redis.set('clients', updatedClients);
    }
}

  @SubscribeMessage('signal-warning')
  async handleEventSignalWarning(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    try {
      const { message } = data;
      
      if(message === 'signal-emit') {
        let existingClients: string[] = await this.redis.get('clients') || [];

        if (!existingClients.includes(client.id)) {
          existingClients.push(client.id);
          await this.redis.set('clients', existingClients);
        }

        client.emit('signal-warning-response', {
          message: 'Client registered for signal-warning.',
        });
      }
    } catch (error) {
      client.disconnect();
      throw new CatchSocketException(error);
    }
  }
}

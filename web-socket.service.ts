import { BehaviorSubject, interval, Subject, Subscription } from 'rxjs';

import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';
import { WebSocketMessage } from './web-socket.model';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private ws: WebSocket;
  private url: string;

  private expected = false;
  private openSubject$ = new BehaviorSubject(false);
  open$ = this.openSubject$.asObservable();

  private restoreScheduled: any;
  private restoreDelay = 1000;
  private keepAliveDelay = 60000;

  private pingSubscription: Subscription;

  private messageSubject$ = new Subject<WebSocketMessage>();
  message$ = this.messageSubject$.asObservable();

  constructor() {
    this.setUrl();
    this.bindCallbacks();
    // this.open();
  }

  private setUrl() {
    this.url = `ws://${window.location.hostname}`;
    if (environment.webSocket.port) {
      this.url += `:${environment.webSocket.port}`;
    }
    this.url += environment.webSocket.pathname;
  }

  private bindCallbacks() {
    this.onOpen = this.onOpen.bind(this);
    this.onClose = this.onClose.bind(this);
    this.onMessage = this.onMessage.bind(this);
    this.onError = this.onError.bind(this);
  }

  open() {
    this.expected = true;
    if (!this.ws) {
      this.ws = new WebSocket(this.url);
      this.ws.addEventListener('open', this.onOpen);
      this.ws.addEventListener('close', this.onClose);
      this.ws.addEventListener('message', this.onMessage);
      this.ws.addEventListener('error', this.onError);
    }
  }

  close() {
    this.expected = false;
    clearTimeout(this.restoreScheduled);
    if (this.ws) {
      this.ws.close();
    }
  }

  private onOpen(event: Event) {
    this.openSubject$.next(true);
    this.startPing();
  }

  private onClose(event: CloseEvent) {
    this.openSubject$.next(false);
    this.stopPing();
    this.ws = null;
    if (this.expected) {
      this.restore();
    }
  }

  private onMessage(event: MessageEvent) {
    const message = JSON.parse(event.data) as WebSocketMessage;
    this.messageSubject$.next(message);
  }

  private onError(event: Event) {
    // log('ERROR', event);
  }

  private startPing() {
    this.pingSubscription = interval(this.keepAliveDelay).subscribe(() => this.keepAlive());
  }

  private stopPing() {
    if (this.pingSubscription) {
      this.pingSubscription.unsubscribe();
    }
  }

  private keepAlive() {
    this.send({ type: 'keepAlive' });
  }

  private restore() {
    this.restoreScheduled = setTimeout(() => this.open(), this.restoreDelay);
  }

  send(message: WebSocketMessage) {
    if (this.openSubject$.value) {
      this.ws.send(JSON.stringify(message));
    } else {
      // handle pending stack...
    }
  }
}

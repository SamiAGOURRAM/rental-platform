import { EventEmitter } from 'node:events';
import type { DomainEvent, DomainEventType, DomainEventPayload } from './event-types.js';

type EventHandler<T extends DomainEventType> = (
  payload: DomainEventPayload<T>,
) => void | Promise<void>;

class TypedEventBus {
  private readonly emitter = new EventEmitter();

  constructor() {
    // Prevent accidental memory leaks — warn in dev if many handlers added
    this.emitter.setMaxListeners(50);
  }

  on<T extends DomainEventType>(event: T, handler: EventHandler<T>): void {
    this.emitter.on(event, (payload: DomainEventPayload<T>) => {
      Promise.resolve(handler(payload)).catch((err) => {
        console.error(`[EventBus] Unhandled error in handler for '${event}':`, err);
      });
    });
  }

  emit<T extends DomainEventType>(event: T, payload: DomainEventPayload<T>): void {
    this.emitter.emit(event, payload);
  }

  /** Emit a fully-typed DomainEvent union */
  emitEvent(event: DomainEvent): void {
    this.emitter.emit(event.type, event.payload);
  }

  off<T extends DomainEventType>(event: T, handler: EventHandler<T>): void {
    this.emitter.off(event, handler);
  }
}

// Singleton event bus shared across the entire application
export const eventBus = new TypedEventBus();

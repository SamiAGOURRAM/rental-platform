import { deliveryRepository } from './delivery.repository.js';
import { personalDeliveryStrategy } from './strategies/personal-delivery.strategy.js';
import { mondialRelayStrategy } from './strategies/mondial-relay.strategy.js';
import { chronopostStrategy } from './strategies/chronopost.strategy.js';
import type { IDeliveryStrategy } from './strategies/delivery-strategy.interface.js';
import { orderRepository } from '../order/order.repository.js';
import { NotFoundError } from '../../common/errors/index.js';
import type { Delivery, DeliveryMethod, DeliveryStatus } from '@prisma/client';
import type { OrderId, DeliveryId } from '../../common/types/branded.js';

const STRATEGIES: Record<DeliveryMethod, IDeliveryStrategy> = {
  personal: personalDeliveryStrategy,
  mondial_relay: mondialRelayStrategy,
  chronopost: chronopostStrategy,
  colissimo: mondialRelayStrategy, // reuse Mondial Relay logic for now (TODO: dedicated strategy)
};

export class DeliveryService {
  async scheduleDelivery(orderId: OrderId): Promise<Delivery> {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new NotFoundError('Order', orderId);

    const strategy = STRATEGIES[order.deliveryMethod];
    const result = await strategy.schedule(orderId, 'outbound', order.rentalStart);

    return deliveryRepository.create({
      order: { connect: { id: orderId } },
      type: order.deliveryMethod,
      direction: 'outbound',
      status: 'scheduled',
      trackingCode: result.trackingCode,
      carrier: result.carrier,
      scheduledAt: result.scheduledAt,
      fee: result.fee,
    });
  }

  async scheduleReturn(orderId: OrderId): Promise<Delivery> {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new NotFoundError('Order', orderId);

    const strategy = STRATEGIES[order.deliveryMethod];
    const result = await strategy.schedule(orderId, 'return', order.rentalEnd);

    return deliveryRepository.create({
      order: { connect: { id: orderId } },
      type: order.deliveryMethod,
      direction: 'return',
      status: 'scheduled',
      trackingCode: result.trackingCode,
      carrier: result.carrier,
      scheduledAt: result.scheduledAt,
      fee: result.fee,
    });
  }

  async updateStatus(deliveryId: DeliveryId, status: DeliveryStatus): Promise<Delivery> {
    const delivery = await deliveryRepository.findById(deliveryId);
    if (!delivery) throw new NotFoundError('Delivery', deliveryId);

    const timestamps: { pickedUpAt?: Date; deliveredAt?: Date } = {};
    if (status === 'picked_up') timestamps.pickedUpAt = new Date();
    if (status === 'delivered') timestamps.deliveredAt = new Date();

    return deliveryRepository.updateStatus(deliveryId, status, timestamps);
  }

  async getOrderDeliveries(orderId: OrderId): Promise<Delivery[]> {
    return deliveryRepository.findByOrderId(orderId);
  }

  async getAvailableMethods(
    city: string,
    date: Date,
  ): Promise<
    Array<{
      method: DeliveryMethod;
      fee: number;
      estimatedHours: number;
      available: boolean;
    }>
  > {
    return Object.entries(STRATEGIES).map(([method, strategy]) => ({
      method: method as DeliveryMethod,
      fee: strategy.getFee('outbound') + strategy.getFee('return'),
      estimatedHours: strategy.estimatedHours(),
      available: strategy.canDeliver(city, date),
    }));
  }

  async getUpcomingDeliveries(limit = 20): Promise<Delivery[]> {
    return deliveryRepository.findUpcoming(limit);
  }
}

export const deliveryService = new DeliveryService();

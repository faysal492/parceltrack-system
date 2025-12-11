import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ParcelStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  FAILED = 'failed',
}

export enum PaymentType {
  COD = 'cod',
  PREPAID = 'prepaid',
}

export enum ParcelSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  EXTRA_LARGE = 'extra_large',
}

@Entity('parcels')
export class Parcel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  trackingNumber: string;

  @ManyToOne(() => User, (user) => user.parcels)
  @JoinColumn({ name: 'customerId' })
  customer: User;

  @Column()
  customerId: string;

  @ManyToOne(() => User, (user) => user.assignedParcels, { nullable: true })
  @JoinColumn({ name: 'deliveryAgentId' })
  deliveryAgent: User;

  @Column({ nullable: true })
  deliveryAgentId: string;

  @Column({
    type: 'enum',
    enum: ParcelStatus,
    default: ParcelStatus.PENDING,
  })
  status: ParcelStatus;

  @Column()
  pickupAddress: string;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  pickupLatitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  pickupLongitude: number;

  @Column()
  deliveryAddress: string;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  deliveryLatitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  deliveryLongitude: number;

  @Column({
    type: 'enum',
    enum: ParcelSize,
  })
  size: ParcelSize;

  @Column({ nullable: true })
  type: string;

  @Column({
    type: 'enum',
    enum: PaymentType,
  })
  paymentType: PaymentType;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  codAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  shippingCost: number;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  currentLatitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  currentLongitude: number;

  @Column({ nullable: true })
  notes: string;

  @Column({ nullable: true })
  failureReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  pickedUpAt: Date;

  @Column({ nullable: true })
  deliveredAt: Date;
}


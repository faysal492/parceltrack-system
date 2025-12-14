import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Parcel } from '../../parcels/entities/parcel.entity';

export enum UserRole {
  ADMIN = 'admin',
  DELIVERY_AGENT = 'delivery_agent',
  CUSTOMER = 'customer',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  phone: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CUSTOMER,
  })
  role: UserRole;

  @Column({ nullable: true })
  vehicleNumber: string;

  @Column({ nullable: true })
  licenseNumber: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  currentLatitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  currentLongitude: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => Parcel, (parcel) => parcel.customer)
  parcels: Parcel[];

  @OneToMany(() => Parcel, (parcel) => parcel.deliveryAgent)
  assignedParcels: Parcel[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}


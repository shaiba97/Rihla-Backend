import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Bus } from '../../buses/entity/bus.entity';

@Entity('trips')
export class Trip {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, name: 'bus_id' })
  busId: string;

  @ManyToOne(() => Bus, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bus_id' })
  bus: Bus;

  @Column({ type: 'timestamp', name: 'presence_time' })
  presenceTime: Date;

  @Column({ type: 'timestamp', name: 'departure_date' })
  departureDate: Date;

  @Column({ type: 'timestamp', name: 'departure_time' })
  departureTime: Date;

  @Column({ type: 'varchar', length: 100, name: 'from_state' })
  fromState: string;

  @Column({ type: 'varchar', length: 100, name: 'from_city' })
  fromCity: string;

  @Column({ type: 'varchar', length: 255, name: 'from_station' })
  fromStation: string;

  @Column({ type: 'timestamp', name: 'arrival_time' })
  arrivalTime: Date;

  @Column({ type: 'timestamp', name: 'arrival_date' })
  arrivalDate: Date;

  @Column({ type: 'varchar', length: 100, name: 'to_state' })
  toState: string;

  @Column({ type: 'varchar', length: 100, name: 'to_city' })
  toCity: string;

  @Column({ type: 'varchar', length: 255, name: 'to_station' })
  toStation: string;

  @Column({ type: 'varchar', length: 50, name: 'status', default: 'SCHEDULED' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

export interface CreateTripResponse {
  id: string;
  busId: string;
  presenceTime: Date;
  departureDate: Date;
  departureTime: Date;
  fromState: string;
  fromCity: string;
  fromStation: string;
  arrivalTime: Date;
  arrivalDate: Date;
  toState: string;
  toCity: string;
  toStation: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateTripResponse extends Partial<CreateTripResponse> {
  id: string;
  updatedAt: Date;
}

export interface TripListResponse {
  trips: CreateTripResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface TripQueryResponse {
  id: string;
  busId: string;
  presenceTime: Date;
  departureDate: Date;
  departureTime: Date;
  fromState: string;
  fromCity: string;
  fromStation: string;
  arrivalTime: Date;
  arrivalDate: Date;
  toState: string;
  toCity: string;
  toStation: string;
  status: string;
  createdAt: Date;
}

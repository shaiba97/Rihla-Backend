import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
// import { Trip } from '../../trips/entity/trip.entity';
import { UserEntity } from '../../users/entity/user.entity';

export enum SeatStartFrom {
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

@Entity('buses')
export class Bus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, name: 'company_id' })
  companyId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: UserEntity;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'int' })
  chairs: number;

  @Column({
    type: 'enum',
    enum: SeatStartFrom,
    default: SeatStartFrom.LEFT,
  })
  seatStartFrom: SeatStartFrom;

  @Column({
    type: 'json',
    comment: 'Bus plate information in Sudan format',
  })
  plate: {
    arabic: string;
    english: string;
    numbers: string;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // @OneToMany(() => Trip, trip => trip.bus)
  // trips: Trip[];
}

export interface BusPlate {
  arabic: string;
  english: string;
  numbers: string;
}

export interface CreateBusResponse {
  id: string;
  companyId: string;
  name: string;
  chairs: number;
  seatStartFrom: SeatStartFrom;
  plate: BusPlate;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateBusResponse extends Partial<CreateBusResponse> {
  id: string;
  updatedAt: Date;
}

export interface BusListResponse {
  buses: CreateBusResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface BusQueryResponse {
  id: string;
  companyId: string;
  name: string;
  chairs: number;
  seatStartFrom: SeatStartFrom;
  plate: BusPlate;
  createdAt: Date;
}

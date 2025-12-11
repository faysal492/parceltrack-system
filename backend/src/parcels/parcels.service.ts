import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Parcel, ParcelStatus } from './entities/parcel.entity';
import { UsersService } from '../users/users.service';
import { CreateParcelDto } from './dto/create-parcel.dto';
import { UpdateParcelStatusDto } from './dto/update-parcel-status.dto';
import { AssignAgentDto } from './dto/assign-agent.dto';

@Injectable()
export class ParcelsService {
  private gateway: any;

  constructor(
    @InjectRepository(Parcel)
    private parcelsRepository: Repository<Parcel>,
    private usersService: UsersService,
  ) {}

  setGateway(gateway: any) {
    this.gateway = gateway;
  }

  async create(createParcelDto: CreateParcelDto, customerId: string): Promise<Parcel> {
    const trackingNumber = this.generateTrackingNumber();
    const parcel = this.parcelsRepository.create({
      ...createParcelDto,
      trackingNumber,
      customerId,
      status: ParcelStatus.PENDING,
    });
    return this.parcelsRepository.save(parcel);
  }

  async findAll(userId?: string, role?: string): Promise<Parcel[]> {
    if (role === 'customer') {
      return this.parcelsRepository.find({
        where: { customerId: userId },
        relations: ['customer', 'deliveryAgent'],
        order: { createdAt: 'DESC' },
      });
    } else if (role === 'delivery_agent') {
      return this.parcelsRepository.find({
        where: { deliveryAgentId: userId },
        relations: ['customer', 'deliveryAgent'],
        order: { createdAt: 'DESC' },
      });
    }
    return this.parcelsRepository.find({
      relations: ['customer', 'deliveryAgent'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId?: string, role?: string): Promise<Parcel> {
    const parcel = await this.parcelsRepository.findOne({
      where: { id },
      relations: ['customer', 'deliveryAgent'],
    });

    if (!parcel) {
      throw new NotFoundException(`Parcel with ID ${id} not found`);
    }

    if (role === 'customer' && parcel.customerId !== userId) {
      throw new ForbiddenException('You do not have access to this parcel');
    }

    if (role === 'delivery_agent' && parcel.deliveryAgentId !== userId) {
      throw new ForbiddenException('You do not have access to this parcel');
    }

    return parcel;
  }

  async findByTrackingNumber(trackingNumber: string): Promise<Parcel> {
    const parcel = await this.parcelsRepository.findOne({
      where: { trackingNumber },
      relations: ['customer', 'deliveryAgent'],
    });

    if (!parcel) {
      throw new NotFoundException(
        `Parcel with tracking number ${trackingNumber} not found`,
      );
    }

    return parcel;
  }

  async assignAgent(
    id: string,
    assignAgentDto: AssignAgentDto,
  ): Promise<Parcel> {
    const parcel = await this.findOne(id);
    const agent = await this.usersService.findOne(assignAgentDto.agentId);

    if (agent.role !== 'delivery_agent') {
      throw new BadRequestException('User is not a delivery agent');
    }

    parcel.deliveryAgentId = assignAgentDto.agentId;
    parcel.status = ParcelStatus.ASSIGNED;
    const savedParcel = await this.parcelsRepository.save(parcel);
    if (this.gateway) {
      this.gateway.emitParcelUpdate(id, savedParcel);
    }
    return savedParcel;
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdateParcelStatusDto,
    userId: string,
    role: string,
  ): Promise<Parcel> {
    const parcel = await this.findOne(id, userId, role);

    if (role === 'delivery_agent' && parcel.deliveryAgentId !== userId) {
      throw new ForbiddenException('You are not assigned to this parcel');
    }

    parcel.status = updateStatusDto.status;

    if (updateStatusDto.status === ParcelStatus.PICKED_UP) {
      parcel.pickedUpAt = new Date();
    } else if (updateStatusDto.status === ParcelStatus.DELIVERED) {
      parcel.deliveredAt = new Date();
    } else if (updateStatusDto.status === ParcelStatus.FAILED) {
      parcel.failureReason = updateStatusDto.failureReason || 'Delivery failed';
    }

    if (updateStatusDto.latitude && updateStatusDto.longitude) {
      parcel.currentLatitude = updateStatusDto.latitude;
      parcel.currentLongitude = updateStatusDto.longitude;
    }

    if (updateStatusDto.notes) {
      parcel.notes = updateStatusDto.notes;
    }

    const savedParcel = await this.parcelsRepository.save(parcel);
    if (this.gateway) {
      this.gateway.emitParcelUpdate(id, savedParcel);
    }
    return savedParcel;
  }

  async updateLocation(
    id: string,
    latitude: number,
    longitude: number,
  ): Promise<Parcel> {
    const parcel = await this.findOne(id);
    parcel.currentLatitude = latitude;
    parcel.currentLongitude = longitude;
    const savedParcel = await this.parcelsRepository.save(parcel);
    if (this.gateway) {
      this.gateway.emitParcelUpdate(id, savedParcel);
    }
    return savedParcel;
  }

  async remove(id: string): Promise<void> {
    const parcel = await this.findOne(id);
    await this.parcelsRepository.remove(parcel);
  }

  private generateTrackingNumber(): string {
    const prefix = 'PT';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }
}


import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ParcelsService } from './parcels.service';
import { RouteOptimizationService } from './route-optimization.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CreateParcelDto } from './dto/create-parcel.dto';
import { UpdateParcelStatusDto } from './dto/update-parcel-status.dto';
import { AssignAgentDto } from './dto/assign-agent.dto';

@Controller('parcels')
@UseGuards(JwtAuthGuard)
export class ParcelsController {
  constructor(
    private readonly parcelsService: ParcelsService,
    private readonly routeOptimizationService: RouteOptimizationService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.CUSTOMER)
  create(@Body() createParcelDto: CreateParcelDto, @Request() req) {
    return this.parcelsService.create(createParcelDto, req.user.id);
  }

  @Get()
  findAll(@Request() req) {
    return this.parcelsService.findAll(
      req.user.id,
      req.user.role,
    );
  }

  @Get('track/:trackingNumber')
  trackByNumber(@Param('trackingNumber') trackingNumber: string) {
    return this.parcelsService.findByTrackingNumber(trackingNumber);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.parcelsService.findOne(id, req.user.id, req.user.role);
  }

  @Patch(':id/assign')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  assignAgent(
    @Param('id') id: string,
    @Body() assignAgentDto: AssignAgentDto,
  ) {
    return this.parcelsService.assignAgent(id, assignAgentDto);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DELIVERY_AGENT, UserRole.ADMIN)
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateParcelStatusDto,
    @Request() req,
  ) {
    return this.parcelsService.updateStatus(
      id,
      updateStatusDto,
      req.user.id,
      req.user.role,
    );
  }

  @Patch(':id/location')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DELIVERY_AGENT)
  updateLocation(
    @Param('id') id: string,
    @Body() location: { latitude: number; longitude: number },
    @Request() req,
  ) {
    return this.parcelsService.updateLocation(
      id,
      location.latitude,
      location.longitude,
    );
  }

  @Get('agent/route')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DELIVERY_AGENT)
  async getOptimizedRoute(@Request() req) {
    const parcels = await this.parcelsService.findAll(req.user.id, req.user.role);
    const activeParcels = parcels.filter(
      (p) => p.status !== 'delivered' && p.status !== 'failed',
    );
    
    if (activeParcels.length === 0) {
      return { routes: [] };
    }

    const agentLocation = {
      lat: req.user.currentLatitude || activeParcels[0].pickupLatitude,
      lng: req.user.currentLongitude || activeParcels[0].pickupLongitude,
    };

    return this.routeOptimizationService.getOptimizedRoute(
      activeParcels,
      agentLocation,
    );
  }

  @Get(':id/route')
  async getRoute(@Param('id') id: string) {
    const parcel = await this.parcelsService.findOne(id);
    return this.routeOptimizationService.getRoute(
      {
        lat: parcel.pickupLatitude,
        lng: parcel.pickupLongitude,
      },
      {
        lat: parcel.deliveryLatitude,
        lng: parcel.deliveryLongitude,
      },
    );
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.parcelsService.remove(id);
  }
}


import { Module, forwardRef, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParcelsService } from './parcels.service';
import { ParcelsController } from './parcels.controller';
import { Parcel } from './entities/parcel.entity';
import { UsersModule } from '../users/users.module';
import { GatewayModule } from '../gateway/gateway.module';
import { RouteOptimizationService } from './route-optimization.service';
import { ModuleRef } from '@nestjs/core';
import { Gateway } from '../gateway/gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([Parcel]),
    UsersModule,
    forwardRef(() => GatewayModule),
  ],
  controllers: [ParcelsController],
  providers: [ParcelsService, RouteOptimizationService],
  exports: [ParcelsService, RouteOptimizationService],
})
export class ParcelsModule implements OnModuleInit {
  constructor(
    private parcelsService: ParcelsService,
    private moduleRef: ModuleRef,
  ) {}

  onModuleInit() {
    // Set gateway after module initialization to break circular dependency
    try {
      const gateway = this.moduleRef.get(Gateway, { strict: false });
      if (gateway) {
        this.parcelsService.setGateway(gateway);
      }
    } catch (error) {
      // Gateway might not be available yet, will be set on next update
      console.warn('Gateway not available yet, will retry');
    }
  }
}

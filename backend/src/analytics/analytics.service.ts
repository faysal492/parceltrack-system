import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Parcel, ParcelStatus, PaymentType } from '../parcels/entities/parcel.entity';
import { User } from '../users/entities/user.entity';
import * as PDFDocument from 'pdfkit';
import * as createCsvWriter from 'csv-writer';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Parcel)
    private parcelsRepository: Repository<Parcel>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async getDashboardMetrics(startDate?: Date, endDate?: Date) {
    // Total Parcels
    let query = this.parcelsRepository.createQueryBuilder('parcel');
    if (startDate && endDate) {
      query.where('parcel.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }
    const totalParcels = await query.getCount();

    // Daily Bookings
    query = this.parcelsRepository.createQueryBuilder('parcel');
    if (startDate && endDate) {
      query.where('parcel.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }
    const dailyBookings = await query
      .select("DATE(parcel.createdAt)", "date")
      .addSelect("COUNT(*)", "count")
      .groupBy("DATE(parcel.createdAt)")
      .orderBy("DATE(parcel.createdAt)", "DESC")
      .limit(30)
      .getRawMany();

    // Failed Deliveries
    query = this.parcelsRepository.createQueryBuilder('parcel');
    if (startDate && endDate) {
      query.where('parcel.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }
    const failedDeliveries = await query
      .andWhere('parcel.status = :status', { status: ParcelStatus.FAILED })
      .getCount();

    // COD Amount
    query = this.parcelsRepository.createQueryBuilder('parcel');
    if (startDate && endDate) {
      query.where('parcel.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }
    const codAmount = await query
      .select("SUM(parcel.codAmount)", "total")
      .andWhere('parcel.paymentType = :type', { type: PaymentType.COD })
      .getRawOne();

    // Status Breakdown
    query = this.parcelsRepository.createQueryBuilder('parcel');
    if (startDate && endDate) {
      query.where('parcel.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }
    const statusBreakdown = await query
      .select("parcel.status", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("parcel.status")
      .getRawMany();

    // Total Revenue
    query = this.parcelsRepository.createQueryBuilder('parcel');
    if (startDate && endDate) {
      query.where('parcel.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }
    const totalRevenue = await query
      .select("SUM(parcel.shippingCost)", "total")
      .getRawOne();

    return {
      totalParcels,
      dailyBookings,
      failedDeliveries,
      codAmount: parseFloat(codAmount?.total || '0'),
      totalRevenue: parseFloat(totalRevenue?.total || '0'),
      statusBreakdown,
    };
  }

  async generateCSVReport(startDate?: Date, endDate?: Date): Promise<string> {
    const queryBuilder = this.parcelsRepository
      .createQueryBuilder('parcel')
      .leftJoinAndSelect('parcel.customer', 'customer')
      .leftJoinAndSelect('parcel.deliveryAgent', 'agent');

    if (startDate && endDate) {
      queryBuilder.where('parcel.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const parcels = await queryBuilder.getMany();

    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const filePath = path.join(tempDir, `report-${Date.now()}.csv`);

    const csvWriter = createCsvWriter.createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'trackingNumber', title: 'Tracking Number' },
        { id: 'customerName', title: 'Customer Name' },
        { id: 'customerEmail', title: 'Customer Email' },
        { id: 'agentName', title: 'Agent Name' },
        { id: 'status', title: 'Status' },
        { id: 'paymentType', title: 'Payment Type' },
        { id: 'codAmount', title: 'COD Amount' },
        { id: 'shippingCost', title: 'Shipping Cost' },
        { id: 'createdAt', title: 'Created At' },
        { id: 'deliveredAt', title: 'Delivered At' },
      ],
    });

    const records = parcels.map((parcel) => ({
      trackingNumber: parcel.trackingNumber,
      customerName: `${parcel.customer?.firstName} ${parcel.customer?.lastName}`,
      customerEmail: parcel.customer?.email || '',
      agentName: parcel.deliveryAgent
        ? `${parcel.deliveryAgent.firstName} ${parcel.deliveryAgent.lastName}`
        : 'Not Assigned',
      status: parcel.status,
      paymentType: parcel.paymentType,
      codAmount: parcel.codAmount,
      shippingCost: parcel.shippingCost,
      createdAt: parcel.createdAt.toISOString(),
      deliveredAt: parcel.deliveredAt?.toISOString() || '',
    }));

    await csvWriter.writeRecords(records);
    return filePath;
  }

  async generatePDFReport(startDate?: Date, endDate?: Date): Promise<Buffer> {
    const queryBuilder = this.parcelsRepository
      .createQueryBuilder('parcel')
      .leftJoinAndSelect('parcel.customer', 'customer')
      .leftJoinAndSelect('parcel.deliveryAgent', 'agent');

    if (startDate && endDate) {
      queryBuilder.where('parcel.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const parcels = await queryBuilder.getMany();
    const metrics = await this.getDashboardMetrics(startDate, endDate);

    const doc = new PDFDocument();
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {});

    doc.fontSize(20).text('Parcel Tracking Report', { align: 'center' });
    doc.moveDown();

    if (startDate && endDate) {
      doc.fontSize(12).text(`Period: ${startDate.toDateString()} - ${endDate.toDateString()}`);
    }

    doc.moveDown();
    doc.fontSize(14).text('Summary', { underline: true });
    doc.fontSize(10);
    doc.text(`Total Parcels: ${metrics.totalParcels}`);
    doc.text(`Failed Deliveries: ${metrics.failedDeliveries}`);
    doc.text(`Total COD Amount: $${metrics.codAmount.toFixed(2)}`);
    doc.text(`Total Revenue: $${metrics.totalRevenue.toFixed(2)}`);

    doc.moveDown();
    doc.fontSize(14).text('Parcels', { underline: true });
    doc.moveDown();

    parcels.forEach((parcel, index) => {
      if (index > 0 && index % 5 === 0) {
        doc.addPage();
      }
      doc.fontSize(10);
      doc.text(`Tracking: ${parcel.trackingNumber}`);
      doc.text(`Customer: ${parcel.customer?.firstName} ${parcel.customer?.lastName}`);
      doc.text(`Status: ${parcel.status}`);
      doc.text(`Payment: ${parcel.paymentType}`);
      doc.text(`Amount: $${parcel.shippingCost}`);
      doc.moveDown(0.5);
    });

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
    });
  }
}


import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddIsActiveToUsers1734124800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column already exists
    const table = await queryRunner.getTable('users');
    const hasColumn = table?.findColumnByName('isActive');

    if (!hasColumn) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'isActive',
          type: 'boolean',
          default: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    const hasColumn = table?.findColumnByName('isActive');

    if (hasColumn) {
      await queryRunner.dropColumn('users', 'isActive');
    }
  }
}


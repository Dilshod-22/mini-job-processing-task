import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateTasksTable1772388300000 implements MigrationInterface {
    name = 'UpdateTasksTable1772388300000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create priority enum
        await queryRunner.query(`CREATE TYPE "public"."tasks_priority_enum" AS ENUM('high', 'normal', 'low')`);

        // Add new columns
        await queryRunner.query(`ALTER TABLE "tasks" ADD "attempts" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "started_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "completed_at" TIMESTAMP WITH TIME ZONE`);

        // Change priority from integer to enum
        await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "priority" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "priority" TYPE "public"."tasks_priority_enum" USING
            CASE
                WHEN priority >= 1 THEN 'high'::"public"."tasks_priority_enum"
                WHEN priority <= -1 THEN 'low'::"public"."tasks_priority_enum"
                ELSE 'normal'::"public"."tasks_priority_enum"
            END`);
        await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "priority" SET DEFAULT 'normal'`);

        // Recreate status enum with CANCELLED instead of CANCELED
        // 1. Drop default value first
        await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "status" DROP DEFAULT`);

        // 2. Create new enum type
        await queryRunner.query(`CREATE TYPE "public"."tasks_status_enum_new" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')`);

        // 3. Update column to use new enum (convert CANCELED to CANCELLED)
        await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "status" TYPE "public"."tasks_status_enum_new" USING
            CASE
                WHEN status::text = 'CANCELED' THEN 'CANCELLED'::"public"."tasks_status_enum_new"
                ELSE status::text::"public"."tasks_status_enum_new"
            END`);

        // 4. Drop old enum and rename new one
        await queryRunner.query(`DROP TYPE "public"."tasks_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."tasks_status_enum_new" RENAME TO "tasks_status_enum"`);

        // 5. Set new default
        await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "status" SET DEFAULT 'PENDING'`);

        // Create indexes
        await queryRunner.query(`CREATE INDEX "IDX_tasks_user_id" ON "tasks" ("user_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_tasks_status" ON "tasks" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_tasks_type" ON "tasks" ("type")`);
        await queryRunner.query(`CREATE INDEX "IDX_tasks_scheduled_at" ON "tasks" ("scheduled_at")`);

        // Remove processed_at column (replaced by started_at and completed_at)
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "processed_at"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Add back processed_at
        await queryRunner.query(`ALTER TABLE "tasks" ADD "processed_at" TIMESTAMP WITH TIME ZONE`);

        // Drop indexes
        await queryRunner.query(`DROP INDEX "public"."IDX_tasks_scheduled_at"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_tasks_type"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_tasks_status"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_tasks_user_id"`);

        // Recreate status enum with CANCELED instead of CANCELLED
        await queryRunner.query(`CREATE TYPE "public"."tasks_status_enum_old" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELED')`);
        await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "status" TYPE "public"."tasks_status_enum_old" USING
            CASE
                WHEN status::text = 'CANCELLED' THEN 'CANCELED'::"public"."tasks_status_enum_old"
                ELSE status::text::"public"."tasks_status_enum_old"
            END`);
        await queryRunner.query(`DROP TYPE "public"."tasks_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."tasks_status_enum_old" RENAME TO "tasks_status_enum"`);

        // Change priority back to integer
        await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "priority" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "priority" TYPE integer USING
            CASE
                WHEN priority::text = 'high' THEN 1
                WHEN priority::text = 'low' THEN -1
                ELSE 0
            END`);
        await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "priority" SET DEFAULT '0'`);

        // Drop priority enum
        await queryRunner.query(`DROP TYPE "public"."tasks_priority_enum"`);

        // Drop new columns
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "completed_at"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "started_at"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "attempts"`);
    }
}

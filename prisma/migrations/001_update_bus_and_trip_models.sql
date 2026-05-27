-- Create the TripStatus enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "TripStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add the status column to Trip table with a default value for existing records
ALTER TABLE "Trip" ADD COLUMN "status" "TripStatus" NOT NULL DEFAULT 'SCHEDULED';

-- Drop the left and right columns from Bus table
ALTER TABLE "Bus" DROP COLUMN IF EXISTS "left";
ALTER TABLE "Bus" DROP COLUMN IF EXISTS "right";

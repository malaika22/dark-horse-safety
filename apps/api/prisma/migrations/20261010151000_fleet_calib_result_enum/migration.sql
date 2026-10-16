-- Older fleet_registers used FAIL; current schema uses FAILED + NOT_DONE.
ALTER TYPE "FleetCalibrationResult" ADD VALUE IF NOT EXISTS 'FAILED';
ALTER TYPE "FleetCalibrationResult" ADD VALUE IF NOT EXISTS 'NOT_DONE';

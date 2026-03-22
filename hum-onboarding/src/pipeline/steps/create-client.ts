import { clientRepo } from 'hum-core';
import type { PipelineStep } from '../types.js';

export const createClientStep: PipelineStep = {
  name: 'create_client',

  async execute(ctx) {
    const intake = ctx.session.intakeData!;
    const clientId = ctx.session.clientId;

    // Update the existing client with full intake data
    await clientRepo.update(ctx.db, clientId, {
      address: intake.address,
      phone: intake.phone,
      latitude: intake.latitude,
      longitude: intake.longitude,
      openingHours: intake.openingHours,
      deliveryPlatforms: intake.deliveryPlatforms,
      planTier: intake.planTier,
    });

    return {
      status: 'complete',
      output: { clientId },
    };
  },
};

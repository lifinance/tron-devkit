import { consola } from 'consola'

/**
 * Prompt user to confirm they are aware they can rent energy (e.g. Zinergy.ag, 1 hr) to reduce TRON deployment costs.
 * Call before starting deployments when not in dry run. If user declines, exits the process.
 */
export async function promptEnergyRentalReminder(): Promise<void> {
  consola.info(
    'Tip: You can rent energy (e.g. from Zinergy.ag for 1 hour) to reduce TRX burn during deployment.'
  )
  const proceed = await consola.prompt('Continue with deployment?', {
    type: 'confirm',
    initial: true,
  })
  if (proceed !== true) {
    consola.info('Deployment cancelled.')
    process.exit(0)
  }
}

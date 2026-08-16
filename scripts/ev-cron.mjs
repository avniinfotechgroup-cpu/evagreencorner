/**
 * EV module maintenance cron entrypoint.
 *
 * Usage (server with env loaded):
 *   node --import tsx scripts/ev-cron.mjs
 *
 * Or from Admin → EV vehicles → "Run maintenance jobs".
 *
 * Env:
 *   EV_SYNC_ENABLED=true   # optional external API sync
 *   EV_API_URL= / EV_API_KEY=
 *   VEHICLE_API_URL= / VEHICLE_API_KEY=
 */
import { runEvMaintenanceJobs } from "../src/lib/vehicles/stale.ts";

const result = await runEvMaintenanceJobs();
console.log(JSON.stringify(result, null, 2));

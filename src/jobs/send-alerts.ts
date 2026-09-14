import { runSendAlerts } from "../scraping/run-send-alerts";

runSendAlerts().catch((err) => {
  console.error(err);
  process.exit(1);
});

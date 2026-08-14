import "dotenv/config";
import { runOfferCheck } from "../scraping/run-check";

runOfferCheck().catch((err) => {
  console.error(err);
  process.exit(1);
});

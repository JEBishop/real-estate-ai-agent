import { tool } from '@langchain/core/tools';
import { ApifyClient } from 'apify-client';
import { z } from 'zod';
import log from '@apify/log';

const client = new ApifyClient({
    token: process.env.APIFY_TOKEN,
});

const extractZipCodesTool = tool(
    async(input) => {
      log.info('in extract_zip_codes');
      log.info(JSON.stringify(input));
      return JSON.stringify({
        zipCodes: input.zipCodes
      });
    },
    {
      name: 'extract_zip_codes',
      description: 'Convert the user\'s request into an array of zip codes.',
      schema: z.object({
        zipCodes: z.array(z.string().describe('Zip Code')).describe('Array of zip codes')
      })
    }
)

const fetchListingsTool = tool(
    async (input) => {
      log.info('in fetch_listings');
      log.info(JSON.stringify(input));
      try {
        // maxcopell/zillow-zip-search
        const run = await client.actor('l7auNT3I30CssRrvO').call(input);
        const { items: listings } = await client.dataset(run.defaultDatasetId).listItems();
        
        log.info(`Found ${listings.length} listings.`);
        /**
         * If we send too many listings to the model it will get rate-limited.
         * Extract the 20 most relevant according to Zillow (first results).
         */
        return JSON.stringify(listings.slice(0,20));
      } catch (err: any) {
        log.error('fetch_listings error: ' + err.message);
        return JSON.stringify({ error: err.message });
      }
    },
    {
      name: 'fetch_listings',
      description: 'Fetch real estate listings.',
      schema: z.object({
        forRent: z.boolean().describe('If listing is for rent.'),
        forSaleByAgent: z.boolean().describe('If listing is for sale by agent.'),
        forSaleByOwner: z.boolean().describe('If listing is for sale by owner.'),
        priceMax: z.number().describe('Maximum buy/rent listing price'),
        priceMin: z.number().describe('Minimum buy/rent listing price'),
        sold: z.boolean().describe('If listing is sold'),
        zipCodes: z.array(z.string().describe('Zip Code')).describe('Array of zip codes')
      })
    }
);

export const agentTools = [
    extractZipCodesTool,
    fetchListingsTool
];

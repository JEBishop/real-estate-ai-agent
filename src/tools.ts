import { Tool } from '@langchain/core/tools';
import { ApifyClient } from 'apify-client';

const client = new ApifyClient({
    token: process.env.APIFY_TOKEN,
});

class FetchListingsTool extends Tool {
    name = 'fetch_listings';
  description = 'Fetch real estate listings.'
  async _call(arg: string) {
    console.log('in fetch_listings')
    console.log(arg)
    try {
        if (typeof arg === 'string') {
          try { arg = JSON.parse(arg); } 
          catch (e) { throw new Error('Input string is not valid JSON'); }
        }
        const run = await client.actor('l7auNT3I30CssRrvO').call(arg);
        const { items: listings } = await client.dataset(run.defaultDatasetId).listItems();
        
        console.log(`Found ${listings.length} listings.`);
        
        return JSON.stringify({ listings: listings });
    } catch (err: any) {
        console.log(err.message);
        return JSON.stringify([]);
    }
  }
}

class OutputFormatterTool extends Tool {
    name = 'output_formatter';
    description = 'Format the output response. The required format is this: { "markdown": string, "html": string }'
    async _call(arg: string) {
        let output;
        console.log(arg);
        try {
            output = JSON.parse(arg);
        } catch (err: any) {
            console.log(err)
            throw new Error('error formatting output: ' + err.message)
        }

        return {
            markdown: output.markdown,
            html: output.html
        }
    }
}

export const agentTools = [
  new FetchListingsTool(),
  //new OutputFormatterTool()
];
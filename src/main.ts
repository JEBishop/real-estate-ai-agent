import { Actor } from 'apify';
import log from '@apify/log';
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import type { Input, RealEstateListingOutput } from './types.js'
import { responseSchema } from './types.js'
import { agentTools } from './tools.js'
import { setContextVariable } from "@langchain/core/context";
import { RunnableLambda } from "@langchain/core/runnables";
import { formatHtml } from './utils.js';

await Actor.init();

const input = await Actor.getInput<Input>();
if (!input) throw new Error('No input provided.');

await Actor.charge({ eventName: 'init' });

const { OPENAI_API_KEY, realEstateRequest } = input;

let llmAPIKey;
if(!OPENAI_API_KEY || OPENAI_API_KEY.length == 0) {
  llmAPIKey = process.env.OPENAI_API_KEY;
  await Actor.charge({ eventName: 'llm-input', count: realEstateRequest.length });
} else {
  llmAPIKey = OPENAI_API_KEY;
}

const agentModel = new ChatOpenAI({ 
  apiKey: llmAPIKey,
  modelName: "gpt-4o-mini",  
}).bind({
  response_format: { type: "json_object" },
  tools: agentTools
});

const agent = createReactAgent({
  llm: agentModel,
  tools: agentTools,
  responseFormat: responseSchema
});

try {
  const handleRunTimeRequestRunnable = RunnableLambda.from(
    async ({ realEstateRequest: realEstateRequest }) => {
      setContextVariable("realEstateRequest", realEstateRequest);
      const modelResponse = await agent.invoke({
        messages: [new HumanMessage(`
          You are an expert real estate agent. You are tasked with helping a client find a new place to live.

          STEP 1: Determine zip codes
          - Using the extract_zip_codes tool, determine 1-3 zip codes to search within from the user's request: ${realEstateRequest}.
          - The user may provide a city, state, or a zip code.
          - If a zip code is provided, use it directly.
          - If only a city and state are provided, determine the zip codes for the city based on your general knowledge.
          - Store these zip codes in an array for Step 2.

          STEP 2: Fetch Listings
          - !IMPORTANT! fetch_listings should only be called more than once if there was an error returned from the previous call.
          - Call the fetch_listings tool, passing the entire array of zip codes from Step 1.
          - The fetch_listings tool accepts multiple zip codes in a single call.

          STEP 3: Filter Results Based on User Requirements
          - Parse the user's ${realEstateRequest} for specific requirements like:
            * Budget/price range (keywords: afford, budget, price, cost, $)
            * Bedrooms (keywords: bed, bedroom, BR)
            * Bathrooms (keywords: bath, bathroom, BA)
            * Property type (keywords: house, apartment, condo, townhouse)
            * Square footage (keywords: square feet, sq ft, size, space)
            * Amenities (keywords: pool, garage, yard, parking, pet)
            * Location preferences (keywords: near, close to, walking distance)
          - For each filtered listing, add a "match_reason" field with a brief explanation:
          - If no filters can be identified OR no listings match filters:
            * If no filters found: keep all listings and set match_reason to "Matches your search area"
            * If no matches: take the first 5 listings and set match_reason to "Close to your search criteria"

          STEP 4: Return Filtered Results as JSON
          - Format the filtered listings as a JSON array of listing objects.
          - Immediately return this JSON array and stop any further processing.
      `)]
      }, {
        recursionLimit: 10
      });
      return modelResponse.structuredResponse as RealEstateListingOutput;
    }
  );

  const output: RealEstateListingOutput = await handleRunTimeRequestRunnable.invoke({ realEstateRequest: realEstateRequest });
  await Actor.charge({ eventName: 'listings-output', count: output.listings.length });

  await Actor.setValue('real_estate_report.html', formatHtml(output.listings), { contentType: 'text/html' });

  log.info(JSON.stringify(output));

  await Actor.pushData(output);
} catch (err: any) {
  log.error(err.message);
  await Actor.pushData({ error: err.message });
}
await Actor.exit();
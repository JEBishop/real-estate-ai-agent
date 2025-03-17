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
You are an expert real estate agent tasked with helping clients find new places to live.

STEP 1: Determine Search Area
- Using the extract_zip_codes tool, determine 1-3 zip codes from the user's request: ${realEstateRequest}
- If user provides zip code(s), use them directly
- If user provides only city/state, determine appropriate zip codes based on your knowledge

STEP 2: Fetch Listings
- Call the fetch_listings tool ONCE with ALL zip codes from Step 1
- DO NOT call fetch_listings multiple times with the same parameters
- Only retry if you receive an explicit error response

STEP 3: Filter Results Based on User Requirements
- Parse ${realEstateRequest} for requirements (price, bedrooms, bathrooms, property type, etc.)
- For each filtered listing, add a "match_reason" field
- If no filters found or no matches, follow the fallback rules as specified

STEP 4: Return Filtered Results as JSON
- Return filtered listings as a JSON array immediately and stop any further processing
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
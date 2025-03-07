import { Actor } from 'apify';
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, MessageContentComplex } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import type { Input } from './types.js'
import { agentTools } from './tools.js'

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
  modelName: "gpt-4o",  
}).bind({
  response_format: { type: "json_object" },
  tools: agentTools
});

const agent = createReactAgent({
  llm: agentModel,
  tools: agentTools
});

try {
  const finalState = await agent.invoke(
    {
      messages: [
        new HumanMessage(`
          You are an expert real estate agent. You are tasked with helping a client find a new place to live.

          STEP 1: Determine the 1-3 zip codes to search within from the user's request: ${realEstateRequest}.
          - The user may provide a city, state, or a zip code.
          - If a zip code is provided, use it directly.
          - If only a city and state are provided, determine the zip codes for the city based on your general knowledge.
          - Store this as 'zipCodes' for the next step.

          STEP 2: Fetch Listings
          - Use the extracted 'zipCodes' from Step 1 to craft an object with this structure:
          {
            "forRent": boolean,
            "forSaleByAgent": boolean,
            "forSaleByOwner": boolean,
            "priceMax": number,
            "sold": boolean,
            "zipCodes": ["zipCode1", "zipCode2", ...]
          }
          - The boolean and number values should be determined from the user's ${realEstateRequest}.
          - Pass the crafted object to the 'fetch_listings' tool.
          - Store the results for filtering in Step 3.

          STEP 3: Filter Results Based on User Requirements
          - Parse the user's ${realEstateRequest} for specific requirements like:
            * Number of bedrooms/bathrooms
            * Square footage
            * Property type (house, apartment, condo)
            * Amenities (pool, garage, etc.)
            * Distance to locations (schools, work, etc.)
          - Filter the listings from Step 2 to match at least one of these requirements.
          - Add a field "match_reason" to each listing where you will describe why the listing was included
          - If no specific filters are mentioned, return all listings from Step 2.
          - If no listings meet the specified filters, return the first 5 listings Step 2.

          STEP 4: Return Filtered Results as JSON
          - Format the filtered listings as a JSON array of objects.
          - Return this JSON without additional commentary.
        `)
      ]
    }, {
      recursionLimit: 10
    }
  );

  var content = finalState.messages[finalState.messages.length - 1].content;
  /**
   * Some GPT models will wrap the output array in an object, despite response formatting and strict prompting.
   * Ex: { "results": [<< our data array >>] }
   * Need to handle these edge cases gracefully in order to guarantee consistent output for users.
   */
  if (typeof content === 'string') {
    try {
      const parsedContent = JSON.parse(content) as MessageContentComplex[];
      if (typeof parsedContent === 'object' && parsedContent !== null && !Array.isArray(parsedContent)) {
        const possibleKeys = ['input', 'output', 'result', 'results', 'response', 'listings', 'homes', 'rentals', 'houses', 'filteredListings', 'filteredHomes', 'filteredRentals', 'filteredHouses'];
        
        const matchingKey = possibleKeys.find(key => key in parsedContent as any);
        
        if (matchingKey) {
          content = (parsedContent as any)[matchingKey];
        } else {
          content = parsedContent;
        }
      } else {
        content = parsedContent; 
      }
    } catch (error) {
      console.error("Failed to parse JSON:", error);
    }
  }
  const output = Array.isArray(content) ? content: [content];

  console.log(output)

  await Actor.charge({ eventName: 'listings-output', count: output.length });

  await Actor.pushData(output);
} catch (e: any) {
  console.log(e);
  await Actor.pushData({ error: e.message });
}
await Actor.exit();
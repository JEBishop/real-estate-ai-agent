export interface Input {
  realEstateRequest: string;
  OPENAI_API_KEY: string;
}

export interface RealEstateListingOutput {
  listings: RealEstateListing[];
}

export interface RealEstateListing {
  id: string;
  detailUrl: string;
  imgSrc?: string;
  price: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  homeType: string;
  area: number;
  match_reason: string;
}

export const responseSchema = {
  type: "object",
  properties: {
    listings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Unique identifier for the rental listing"
          },
          imgSrc: {
            type: "string"
          },
          detailUrl: {
            type: "string",
            description: "URL to the detailed listing page"
          },
          price: {
            type: "string",
            description: "Rental price formatted as string (e.g. '$1,985/mo')"
          },
          address: {
            type: "string",
            description: "Full address of the property"
          },
          bedrooms: {
            type: "number",
            description: "Number of bedrooms (0 for studio)"
          },
          bathrooms: {
            type: "number",
            description: "Number of bathrooms"
          },
          homeType: {
            type: "string",
            description: "Type of residence (e.g. 'APARTMENT', 'HOUSE')"
          },
          area: {
            type: "number",
            description: "Square footage of the property"
          },
          match_reason: {
            type: "string",
            description: "Explanation of why this listing matches search criteria"
          }
        },
        required: ["id", "detailUrl", "price", "address", "bedrooms", "bathrooms", "homeType", "area", "match_reason"]
      }
    }
  },
  required: ["listings"]
}
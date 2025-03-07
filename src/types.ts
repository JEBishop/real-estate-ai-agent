import { z } from 'zod';

export interface NewsFeed {
    name: string;
    url: string;
    source: string;
}

export const NewsFeedZod = z.object({
  name: z.string(),
  url: z.string(),
  source: z.string(),
});

export interface SearchQuery {
  query: string;
}

export const SearchQueryZod = z.object({
  query: z.string()
});

export interface NewsStory {
  title: string,
  link: string,
  summary: string,
  source: string
}

export const NewsStoryZod = z.object({
  aggregate: z.string()
})

export interface Input {
  realEstateRequest: string;
  OPENAI_API_KEY: string;
}
import { defineCollection, z } from 'astro:content';

const production = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    category: z.enum(['educational', 'theater']),
    description: z.string().optional(),
    poster: z.string().optional(),
    status: z.enum(['upcoming', 'now-showing', 'past']).default('upcoming'),
    featured: z.boolean().default(false),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    venue: z.string().optional(),
    ticketUrl: z.string().url().optional(),
    bookingUrl: z.string().url().optional(),
    published: z.boolean().default(false),
  }),
});

const workshop = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    image: z.string().optional(),
    facilitator: z.string().optional(),
    audience: z.string().optional(),
    schedule: z.string().optional(),
    venue: z.string().optional(),
    registrationUrl: z.string().url().optional(),
    published: z.boolean().default(false),
  }),
});

const event = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date().optional(),
    venue: z.string().optional(),
    description: z.string().optional(),
    link: z.string().url().optional(),
    published: z.boolean().default(false),
  }),
});

export const collections = { productions: production, workshops: workshop, events: event };

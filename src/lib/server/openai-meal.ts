import { z } from 'zod';

const DEFAULT_MODEL = 'gpt-5.4-mini';

const LANGUAGE = { en: 'English', es: 'Spanish' } as const;

const SYSTEM_PROMPT = `You are a registered dietitian estimating the nutrition of a meal from a photo.
- First decide whether the photo shows food or drink someone is about to eat. If it doesn't, set is_food to false, use an empty name and no items.
- Otherwise list each distinct food item you can see, with a realistic portion: a quantity and unit as a person would say it (e.g. 1 cup, 2 slices, 150 g) and your estimate of its weight in grams.
- Estimate calories (kcal), protein, carbs and fat in grams for each item's portion, using typical values for how it looks prepared (oil, sauces and dressings count).
- Give each item a confidence from 0 to 1 for how sure you are about what it is and how much there is.
- Name the meal in a few words, the way it would appear in a food diary.`;

const nullableNumber = (description: string) => ({ type: ['number', 'null'], description });

const RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'meal_analysis',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['is_food', 'name', 'items'],
      properties: {
        is_food: { type: 'boolean', description: 'Whether the photo shows food or drink' },
        name: { type: 'string', description: 'Short name of the meal' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['name', 'quantity', 'unit', 'grams', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'confidence'],
            properties: {
              name: { type: 'string' },
              quantity: nullableNumber('How many units, e.g. 2 for "2 slices"'),
              unit: { type: ['string', 'null'], description: 'The unit, e.g. "slices", "cup", "g"' },
              grams: nullableNumber('Estimated weight of the portion in grams'),
              calories: { type: 'number', description: 'kcal for the portion' },
              protein_g: { type: 'number' },
              carbs_g: { type: 'number' },
              fat_g: { type: 'number' },
              confidence: { type: 'number', description: '0 to 1' },
            },
          },
        },
      },
    },
  },
} as const;

const nonNegative = z.number().transform((n) => Math.max(0, n));

const mealAnalysisSchema = z.object({
  is_food: z.boolean(),
  name: z.string(),
  items: z.array(
    z.object({
      name: z.string().min(1),
      quantity: nonNegative.nullable(),
      unit: z.string().nullable(),
      grams: nonNegative.nullable(),
      calories: nonNegative,
      protein_g: nonNegative,
      carbs_g: nonNegative,
      fat_g: nonNegative,
      confidence: z.number().transform((n) => Math.min(Math.max(n, 0), 1)),
    })
  ),
});

export type MealAnalysis = z.infer<typeof mealAnalysisSchema> & { model: string };

/** Asks OpenAI to identify the food in a photo and estimate its nutrition. Throws on any failure. */
export async function analyzeMealPhoto(imageUrl: string, locale: keyof typeof LANGUAGE): Promise<MealAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');
  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: `Write the meal and item names in ${LANGUAGE[locale]}.` },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      response_format: RESPONSE_FORMAT,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`OpenAI request failed (${res.status}): ${await res.text()}`);

  const body = await res.json();
  const message = body.choices?.[0]?.message;
  if (message?.refusal) throw new Error(`OpenAI refused: ${message.refusal}`);
  if (typeof message?.content !== 'string') throw new Error('OpenAI returned no content');

  return { ...mealAnalysisSchema.parse(JSON.parse(message.content)), model };
}

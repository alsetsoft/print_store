"use server"

import { getOpenAIClient } from "@/lib/openai"

export interface ProductInput {
  baseName: string
  baseDescription: string | null
  printName: string
  printDescription: string | null
}

export interface ProductTexts {
  name: string
  description: string
}

export async function generateProductTexts(
  products: ProductInput[]
): Promise<ProductTexts[]> {
  if (products.length === 0) return []

  const batchSize = 20
  const results: ProductTexts[] = []

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize)
    try {
      const batchResults = await generateBatch(batch)
      results.push(...batchResults)
    } catch (err) {
      console.error("OpenAI generation failed for batch:", err)
      // Fallback for entire batch
      results.push(
        ...batch.map((p) => ({
          name: `${p.baseName} - ${p.printName}`,
          description: "",
        }))
      )
    }
  }

  return results
}

async function generateBatch(
  products: ProductInput[]
): Promise<ProductTexts[]> {
  const openai = getOpenAIClient()

  const itemsList = products
    .map(
      (p, i) =>
        `${i + 1}. \u041E\u0441\u043D\u043E\u0432\u0430: "${p.baseName}"${p.baseDescription ? ` (\u043E\u043F\u0438\u0441: ${p.baseDescription})` : ""}, \u041F\u0440\u0438\u043D\u0442: "${p.printName}"${p.printDescription ? ` (\u043E\u043F\u0438\u0441: ${p.printDescription})` : ""}`
    )
    .join("\n")

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `\u0422\u0438 \u2014 \u043A\u043E\u043F\u0456\u0440\u0430\u0439\u0442\u0435\u0440 \u0456\u043D\u0442\u0435\u0440\u043D\u0435\u0442-\u043C\u0430\u0433\u0430\u0437\u0438\u043D\u0443. \u0413\u0435\u043D\u0435\u0440\u0443\u0439 \u043F\u0440\u0438\u0440\u043E\u0434\u043D\u0456, \u043F\u0440\u0438\u0432\u0430\u0431\u043B\u0438\u0432\u0456 \u043D\u0430\u0437\u0432\u0438 \u0442\u043E\u0432\u0430\u0440\u0456\u0432 \u0442\u0430 \u043A\u043E\u0440\u043E\u0442\u043A\u0456 \u043E\u043F\u0438\u0441\u0438 \u0443\u043A\u0440\u0430\u0457\u043D\u0441\u044C\u043A\u043E\u044E \u043C\u043E\u0432\u043E\u044E.
\u041A\u043E\u0436\u0435\u043D \u0442\u043E\u0432\u0430\u0440 \u2014 \u0446\u0435 \u043E\u0441\u043D\u043E\u0432\u0430 (\u0437\u0430\u0433\u043E\u0442\u043E\u0432\u043A\u0430, \u043D\u0430\u043F\u0440. \u0444\u0443\u0442\u0431\u043E\u043B\u043A\u0430, \u0447\u0430\u0448\u043A\u0430) \u0437 \u043D\u0430\u043D\u0435\u0441\u0435\u043D\u0438\u043C \u043F\u0440\u0438\u043D\u0442\u043E\u043C.
\u041D\u0430\u0437\u0432\u0430 \u043C\u0430\u0454 \u0431\u0443\u0442\u0438 \u043A\u043E\u0440\u043E\u0442\u043A\u043E\u044E (3\u20137 \u0441\u043B\u0456\u0432), \u043F\u0440\u0438\u0440\u043E\u0434\u043D\u043E\u044E \u0442\u0430 \u043C\u0456\u0441\u0442\u0438\u0442\u0438 \u0442\u0438\u043F \u0442\u043E\u0432\u0430\u0440\u0443 \u0442\u0430 \u0442\u0435\u043C\u0443 \u043F\u0440\u0438\u043D\u0442\u0443.
\u041E\u043F\u0438\u0441 \u2014 1\u20132 \u0440\u0435\u0447\u0435\u043D\u043D\u044F, \u0449\u043E \u043F\u0456\u0434\u043A\u0440\u0435\u0441\u043B\u044E\u044E\u0442\u044C \u043F\u0435\u0440\u0435\u0432\u0430\u0433\u0438 \u0442\u043E\u0432\u0430\u0440\u0443 \u0442\u0430 \u0434\u0438\u0437\u0430\u0439\u043D.

\u0412\u0456\u0434\u043F\u043E\u0432\u0456\u0434\u044C \u0443 JSON: { "products": [{ "name": "...", "description": "..." }, ...] }
\u041A\u0456\u043B\u044C\u043A\u0456\u0441\u0442\u044C \u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0456\u0432 \u0443 \u043C\u0430\u0441\u0438\u0432\u0456 \u043C\u0430\u0454 \u0442\u043E\u0447\u043D\u043E \u0432\u0456\u0434\u043F\u043E\u0432\u0456\u0434\u0430\u0442\u0438 \u043A\u0456\u043B\u044C\u043A\u043E\u0441\u0442\u0456 \u0442\u043E\u0432\u0430\u0440\u0456\u0432 \u0443 \u0437\u0430\u043F\u0438\u0442\u0456.`,
      },
      {
        role: "user",
        content: `\u0421\u0433\u0435\u043D\u0435\u0440\u0443\u0439 \u043D\u0430\u0437\u0432\u0438 \u0442\u0430 \u043E\u043F\u0438\u0441\u0438 \u0434\u043B\u044F ${products.length} \u0442\u043E\u0432\u0430\u0440\u0456\u0432:\n${itemsList}`,
      },
    ],
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error("Empty OpenAI response")

  const parsed = JSON.parse(content) as { products: ProductTexts[] }

  if (!Array.isArray(parsed.products) || parsed.products.length !== products.length) {
    throw new Error("OpenAI returned wrong number of products")
  }

  return parsed.products
}

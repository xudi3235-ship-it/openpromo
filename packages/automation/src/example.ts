import { Stagehand } from "@browserbasehq/stagehand";
import z from "zod";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

async function main() {
  const stagehand = new Stagehand({
    /**
     * With npx create-browser-app, this config is found
     * in a separate stagehand.config.ts file
     */
    env: "LOCAL",
    modelName: "gpt-4o",
    modelClientOptions: {
      apiKey,
    },
  });
  await stagehand.init();

  const page = stagehand.page;

  await page.goto("https://www.google.com");
  await page.act("Type in 'Browserbase' into the search bar");

  const { title } = await page.extract({
    instruction: "The title of the first search result",
    schema: z.object({
      title: z.string(),
    }),
  });
  console.log("Title of the first search result:", title);

  await stagehand.close();
}

main().catch(console.error);

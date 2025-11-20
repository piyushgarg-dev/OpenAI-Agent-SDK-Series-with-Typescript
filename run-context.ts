import 'dotenv/config';
import { Agent, run, tool, RunContext } from '@openai/agents';
import { z } from 'zod';

interface MyContext {
  userId: string;
  userName: string;

  fetchUserInfoFromDb: () => Promise<string>;
}

const getUserInfoTool = tool({
  name: 'get_user_info',
  description: 'Gets the user info',
  parameters: z.object({}),
  execute: async (
    _,
    ctx?: RunContext<MyContext>
  ): Promise<string | undefined> => {
    const result = await ctx?.context.fetchUserInfoFromDb();
    return result;
  },
});

const customerSupportAgent = new Agent<MyContext>({
  name: 'Customer Support Agent',
  tools: [getUserInfoTool],
  instructions: ({ context }) => {
    return `You're an expert customer support agent`;
  },
});

async function main(query: string, ctx: MyContext) {
  const result = await run(customerSupportAgent, query, {
    context: ctx,
  });
  console.log(`Result:`, result.finalOutput);
}

main('Hey, what is my name?', {
  userId: '2',
  userName: 'Jhon Doe',
  fetchUserInfoFromDb: async () => `UserId=2,UserName=Jhon`,
});

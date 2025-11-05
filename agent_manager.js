import 'dotenv/config';
import { Agent, tool, run } from '@openai/agents';
import { z } from 'zod';

import fs from 'node:fs/promises';

const fetchAvailablePlans = tool({
  name: 'fetch_available_plans',
  description: 'fetches the available plans for internet',
  parameters: z.object({}),
  execute: async function () {
    return [
      { plan_id: '1', price_inr: 399, speed: '30MB/s' },
      { plan_id: '2', price_inr: 999, speed: '100MB/s' },
      { plan_id: '3', price_inr: 1499, speed: '200MB/s' },
    ];
  },
});

const processRefund = tool({
  name: 'process_refund',
  description: `This tool processes the refund for a customer`,
  parameters: z.object({
    customerId: z.string().describe('id of the customer'),
    reason: z.string().describe('reason for refund'),
  }),
  execute: async function ({ customerId, reason }) {
    await fs.appendFile(
      './refunds.txt',
      `Refund for Customer having ID ${customerId} for ${reason}`,
      'utf-8'
    );
    return { refundIssued: true };
  },
});

const refundAgent = new Agent({
  name: 'Refund Agent',
  instructions: `You are expert in issuing refunds to the customer`,
  tools: [processRefund],
});

const salesAgent = new Agent({
  name: 'Sales Agent',
  instructions: `
        You are an expert sales agent for an internet broadband comapny.
        Talk to the user and help them with what they need.
    `,
  tools: [
    fetchAvailablePlans,
    refundAgent.asTool({
      toolName: 'refund_expert',
      toolDescription: 'Handles refund questions and requests.',
    }),
  ],
});

async function runAgent(query = '') {
  const result = await run(salesAgent, query);
  console.log(result.finalOutput);
}

runAgent(
  `I had a plan 399. I need a refund right now. my cus id is cust123 because of I am shifting to a new place`
);

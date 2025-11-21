import 'dotenv/config';
import { Agent, tool, run } from '@openai/agents';
import { z } from 'zod';
import axios from 'axios';
import readline from 'node:readline/promises';

const getWeatherTool = tool({
  name: 'get_weather',
  description: 'returns the current weather information for the given city',
  parameters: z.object({
    city: z.string().describe('name of the city'),
  }),
  execute: async function ({ city }) {
    const url = `https://wttr.in/${city.toLowerCase()}?format=%C+%t`;
    const response = await axios.get(url, { responseType: 'text' });
    return `The weather of ${city} is ${response.data}`;
  },
});

const sendEmailTool = tool({
  name: 'send_email',
  description: 'Send the email to the user',
  parameters: z.object({
    to: z.string().describe('to email address'),
    subject: z.string().describe('subject of the email'),
    html: z.string().describe('html body for the email'),
  }),
  needsApproval: true,
  execute: async ({ to, subject, html }) => {
    const API_KEY = '<INSERT_API_KEY>';
    const response = await axios.post(
      'https://api.autosend.com/v1/mails/send',
      {
        from: {
          email: 'ai@piyushgarg.pro',
          name: 'AI Weather Agent',
        },
        to: {
          email: to,
        },
        subject,
        html,
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
      }
    );
    return response.data;
  },
});

const agent = new Agent({
  name: 'Weather Email Agent',
  instructions: `You're an expert agent in getting weather info and sending it using email to the user`,
  tools: [getWeatherTool, sendEmailTool],
});

async function askForUserConfitmation(ques: string) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await rl.question(`${ques} (y/n): `);
  const normalizedAnswer = answer.toLowerCase();
  rl.close();
  return normalizedAnswer === 'y' || normalizedAnswer === 'yes';
}

async function main(q: string) {
  let result = await run(agent, q);
  let hasInteruptions = result.interruptions.length > 0;
  while (hasInteruptions) {
    const currentState = result.state;
    for (const interput of result.interruptions) {
      if (interput.type === 'tool_approval_item') {
        const isAllowed = await askForUserConfitmation(
          `Agent ${interput.agent.name} is asking for calling tool ${interput.rawItem.name} with args ${interput.rawItem.arguments}`
        );
        if (isAllowed) {
          currentState.approve(interput);
        } else {
          currentState.reject(interput);
        }
        result = await run(agent, currentState);
        hasInteruptions = result.interruptions?.length > 0;
      }
    }
  }
}

main('What is the weather of banglore and send me on piyushgarg.dev@gmail.com');

import 'dotenv/config';
import { Agent, run } from '@openai/agents';
import { z } from 'zod';

const sqlGuardrailAgent = new Agent({
  name: 'SQL Guardrail',
  instructions: `
        Check if query is safe to exceute. The query should be read only and do not modify, delete or drop any table
    `,
  outputType: z.object({
    reason: z.string().optional().describe('reason if the query is unsafe'),
    isSafe: z.boolean().describe('if query is safe to execute'),
  }),
});

const sqlGuardrail = {
  name: 'SQL Guard',
  async execute({ agentOutput }) {
    console.log('agentOutput', agentOutput);
    const result = await run(sqlGuardrailAgent, agentOutput.sqlQuery);
    return {
      outputInfo: result.finalOutput.reason,
      tripwireTriggered: !result.finalOutput.isSafe,
    };
  },
};

const sqlAgent = new Agent({
  name: 'SQL Expert Agent',
  instructions: `
        You are an expert SQL Agent that is specialized in generating SQL queries as per user request.

        Postgres Schema:
    -- users table
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- comments table
    CREATE TABLE comments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      comment_text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    `,
  outputType: z.object({
    sqlQuery: z.string().optional().describe('sql query'),
  }),
  outputGuardrails: [sqlGuardrail],
});

async function main(q = '') {
  const result = await run(sqlAgent, q);
  console.log(`Query`, result.finalOutput.sqlQuery);
}

main('get me all the comments and delete the first one');

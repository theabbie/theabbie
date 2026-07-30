#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const ABOUT_URL = "https://theabbie.github.io/about.json";
const VERSION = "2.0.0";

async function fetchAbout() {
  const res = await fetch(ABOUT_URL, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${ABOUT_URL}: HTTP ${res.status}`);
  }
  return res.json();
}

const server = new McpServer({
  name: "theabbie",
  version: VERSION,
});

server.registerTool(
  "get_theabbie_info",
  {
    title: "Get info about theabbie",
    description:
      "Fetches live information about theabbie (Abhishek Chaudhary) from " +
      ABOUT_URL +
      " — personal details, contact info, professional background and more.",
    inputSchema: {
      section: z
        .string()
        .optional()
        .describe(
          "Optional top-level section of the JSON to return (e.g. 'personal', 'contact', 'professional'). Omit for the full document."
        ),
    },
  },
  async ({ section }) => {
    let about;
    try {
      about = await fetchAbout();
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error fetching theabbie info: ${err.message}` }],
        isError: true,
      };
    }
    if (section) {
      if (!Object.prototype.hasOwnProperty.call(about, section)) {
        return {
          content: [
            {
              type: "text",
              text: `Unknown section "${section}". Available sections: ${Object.keys(about).join(", ")}`,
            },
          ],
          isError: true,
        };
      }
      return { content: [{ type: "text", text: JSON.stringify(about[section], null, 2) }] };
    }
    return { content: [{ type: "text", text: JSON.stringify(about, null, 2) }] };
  }
);

server.registerResource(
  "about",
  "theabbie://about.json",
  {
    title: "theabbie profile (about.json)",
    description: "Raw JSON profile of theabbie, fetched live from " + ABOUT_URL,
    mimeType: "application/json",
  },
  async (uri) => {
    const about = await fetchAbout();
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(about, null, 2),
        },
      ],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`theabbie MCP server v${VERSION} running on stdio`);

import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { createRequestLogger } from "../utils/logger.js";
import { ExaApiClient, handleApiError } from "../utils/api.js";

export function registerDeleteEnrichmentTool(server: McpServer, config?: { exaApiKey?: string }): void {
  server.tool(
    "delete_enrichment",
    "Delete an enrichment from a webset. This will remove all enriched data for this enrichment from all items.",
    {
      websetId: z.string().describe("The ID or externalId of the webset"),
      enrichmentId: z.string().describe("The ID of the enrichment to delete")
    },
    async ({ websetId, enrichmentId }) => {
      const requestId = `delete_enrichment-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'delete_enrichment');
      
      logger.start(`Deleting enrichment ${enrichmentId} from webset: ${websetId}`);
      
      try {
        const client = new ExaApiClient(config?.exaApiKey || process.env.EXA_API_KEY || '');
        
        logger.log("Sending delete enrichment request to API");
        
        await client.delete(
          API_CONFIG.ENDPOINTS.WEBSET_ENRICHMENT_BY_ID(websetId, enrichmentId)
        );
        
        logger.log(`Deleted enrichment: ${enrichmentId}`);

        const result = {
          content: [{
            type: "text" as const,
            text: `Successfully deleted enrichment ${enrichmentId} from webset ${websetId}`
          }]
        };
        
        logger.complete();
        return result;
      } catch (error) {
        return handleApiError(error, logger, 'deleting enrichment');
      }
    }
  );
}

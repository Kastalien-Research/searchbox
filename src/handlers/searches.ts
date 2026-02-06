import type { Exa } from 'exa-js';
import { OperationHandler, successResult, errorResult } from './types.js';

export const create: OperationHandler = async (args, exa) => {
  try {
    const websetId = args.websetId as string;
    const params: Record<string, unknown> = { query: args.query };

    if (args.count) params.count = args.count;
    if (args.entity) params.entity = args.entity;
    if (args.criteria) params.criteria = args.criteria;
    if (args.behavior) params.behavior = args.behavior;
    if (args.recall !== undefined) params.recall = args.recall;
    if (args.metadata) params.metadata = args.metadata;

    const response = await exa.websets.searches.create(websetId, params as any);
    return successResult(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: 'text' as const,
        text: `Error in searches.create: ${message}\n\nCommon issues:\n- criteria must be array of objects: [{description: "criterion"}]\n- entity must be object: {type: "company"}\n- count must be a positive number\n- behavior must be "override" or "append"`,
      }],
      isError: true,
    };
  }
};

export const get: OperationHandler = async (args, exa) => {
  try {
    const response = await exa.websets.searches.get(
      args.websetId as string,
      args.searchId as string,
    );
    return successResult(response);
  } catch (error) {
    return errorResult('searches.get', error);
  }
};

export const cancel: OperationHandler = async (args, exa) => {
  try {
    const response = await exa.websets.searches.cancel(
      args.websetId as string,
      args.searchId as string,
    );
    return successResult(response);
  } catch (error) {
    return errorResult('searches.cancel', error);
  }
};

import type { Exa } from 'exa-js';
import { OperationHandler, successResult, errorResult } from './types.js';

export const list: OperationHandler = async (args, exa) => {
  try {
    const response = await exa.websets.items.list(args.websetId as string, {
      limit: args.limit as number | undefined,
      cursor: args.cursor as string | undefined,
    });
    return successResult(response);
  } catch (error) {
    return errorResult('items.list', error);
  }
};

export const get: OperationHandler = async (args, exa) => {
  try {
    const response = await exa.websets.items.get(
      args.websetId as string,
      args.itemId as string,
    );
    return successResult(response);
  } catch (error) {
    return errorResult('items.get', error);
  }
};

export const del: OperationHandler = async (args, exa) => {
  try {
    const response = await exa.websets.items.delete(
      args.websetId as string,
      args.itemId as string,
    );
    return successResult(response);
  } catch (error) {
    return errorResult('items.delete', error);
  }
};

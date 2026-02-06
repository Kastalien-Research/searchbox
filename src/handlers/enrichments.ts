import type { Exa } from 'exa-js';
import { OperationHandler, successResult, errorResult } from './types.js';

export const create: OperationHandler = async (args, exa) => {
  try {
    const websetId = args.websetId as string;
    const format = args.format as string | undefined;
    const options = args.options as Array<{ label: string }> | undefined;

    // Application-level validation: options required when format='options'
    if (format === 'options' && (!options || options.length === 0)) {
      return {
        content: [{
          type: 'text' as const,
          text: `When format is "options", you must provide the options parameter with at least one option.`,
        }],
        isError: true,
      };
    }

    // Application-level validation: max 150 options
    if (options && options.length > 150) {
      return {
        content: [{
          type: 'text' as const,
          text: `Too many options: ${options.length}. Maximum is 150 options.`,
        }],
        isError: true,
      };
    }

    const params: Record<string, unknown> = { description: args.description };
    if (format) params.format = format;
    if (options) params.options = options;
    if (args.metadata) params.metadata = args.metadata;

    const response = await exa.websets.enrichments.create(websetId, params as any);
    return successResult(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: 'text' as const,
        text: `Error in enrichments.create: ${message}\n\nCommon issues:\n- options must be array of objects: [{label: "option"}]\n- format must be one of: text, date, number, options, email, phone, url\n- When format is "options", you must provide the options parameter`,
      }],
      isError: true,
    };
  }
};

export const get: OperationHandler = async (args, exa) => {
  try {
    const response = await exa.websets.enrichments.get(
      args.websetId as string,
      args.enrichmentId as string,
    );
    return successResult(response);
  } catch (error) {
    return errorResult('enrichments.get', error);
  }
};

export const cancel: OperationHandler = async (args, exa) => {
  try {
    const response = await exa.websets.enrichments.cancel(
      args.websetId as string,
      args.enrichmentId as string,
    );
    return successResult(response);
  } catch (error) {
    return errorResult('enrichments.cancel', error);
  }
};

export const update: OperationHandler = async (args, exa) => {
  try {
    const websetId = args.websetId as string;
    const enrichmentId = args.enrichmentId as string;
    const params: Record<string, unknown> = {};

    if (args.description) params.description = args.description;
    if (args.format) params.format = args.format;
    if (args.options) params.options = args.options;
    if (args.metadata !== undefined) params.metadata = args.metadata;

    // enrichments.update returns void
    await exa.websets.enrichments.update(websetId, enrichmentId, params as any);
    return successResult({ success: true, enrichmentId });
  } catch (error) {
    return errorResult('enrichments.update', error);
  }
};

export const del: OperationHandler = async (args, exa) => {
  try {
    const response = await exa.websets.enrichments.delete(
      args.websetId as string,
      args.enrichmentId as string,
    );
    return successResult(response);
  } catch (error) {
    return errorResult('enrichments.delete', error);
  }
};

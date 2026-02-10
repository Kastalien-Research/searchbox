import { describe, it, expect, vi } from 'vitest';
import { registerManageWebsetsTool } from '../manageWebsets.js';

describe('registerManageWebsetsTool', () => {
  it('applies safe compat coercions and returns metadata', async () => {
    let handler: ((input: { operation: string; args?: Record<string, unknown> }) => Promise<any>) | null = null;

    const fakeServer = {
      registerTool: vi.fn((_name, _config, fn) => {
        handler = fn;
      }),
    };

    const createSpy = vi.fn().mockResolvedValue({
      id: 'search_1',
      status: 'completed',
      query: 'ai startups',
    });

    const exa = {
      websets: {
        searches: {
          create: createSpy,
        },
      },
    } as any;

    registerManageWebsetsTool(fakeServer as any, exa);
    expect(handler).not.toBeNull();

    const result = await handler!({
      operation: 'searches.create',
      args: {
        compat: { mode: 'safe' },
        websetId: 'ws_1',
        query: 'ai startups',
        entity: 'company',
        criteria: ['has funding'],
        count: '25',
      },
    });

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledWith('ws_1', {
      query: 'ai startups',
      count: 25,
      entity: { type: 'company' },
      criteria: [{ description: 'has funding' }],
    });

    const body = JSON.parse(result.content[0].text);
    expect(body._coercions).toHaveLength(3);
    expect(body._coercions.map((c: { path: string }) => c.path)).toEqual([
      'args.entity',
      'args.criteria',
      'args.count',
    ]);
  });

  it('does not coerce when compat mode is not set', async () => {
    let handler: ((input: { operation: string; args?: Record<string, unknown> }) => Promise<any>) | null = null;

    const fakeServer = {
      registerTool: vi.fn((_name, _config, fn) => {
        handler = fn;
      }),
    };

    const createSpy = vi.fn().mockResolvedValue({
      id: 'search_1',
      status: 'completed',
      query: 'ai startups',
    });

    const exa = {
      websets: {
        searches: {
          create: createSpy,
        },
      },
    } as any;

    registerManageWebsetsTool(fakeServer as any, exa);
    expect(handler).not.toBeNull();

    await handler!({
      operation: 'searches.create',
      args: {
        websetId: 'ws_1',
        query: 'ai startups',
        entity: 'company',
        criteria: ['has funding'],
      },
    });

    expect(createSpy).toHaveBeenCalledWith('ws_1', {
      query: 'ai startups',
      entity: 'company',
      criteria: ['has funding'],
    });
  });

  it('reports warning for unsupported compat mode', async () => {
    let handler: ((input: { operation: string; args?: Record<string, unknown> }) => Promise<any>) | null = null;

    const fakeServer = {
      registerTool: vi.fn((_name, _config, fn) => {
        handler = fn;
      }),
    };

    const createSpy = vi.fn().mockResolvedValue({
      id: 'search_1',
      status: 'completed',
      query: 'ai startups',
    });

    const exa = {
      websets: {
        searches: {
          create: createSpy,
        },
      },
    } as any;

    registerManageWebsetsTool(fakeServer as any, exa);
    expect(handler).not.toBeNull();

    const result = await handler!({
      operation: 'searches.create',
      args: {
        compat: { mode: 'aggressive' },
        websetId: 'ws_1',
        query: 'ai startups',
      },
    });

    const body = JSON.parse(result.content[0].text);
    expect(body._warnings).toEqual(['Unsupported compat mode "aggressive"; ignored.']);
  });
});


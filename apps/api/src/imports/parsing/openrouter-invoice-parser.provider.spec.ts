import { OpenRouterInvoiceParser } from './openrouter-invoice-parser.provider';

describe('OpenRouterInvoiceParser', () => {
  const OLD = process.env;
  beforeEach(() => { process.env = { ...OLD, OPENROUTER_API_KEY: 'test-key', OPENROUTER_RETRY_BASE_MS: '0' }; });
  afterEach(() => { process.env = OLD; jest.restoreAllMocks(); });

  it('posts to OpenRouter and parses JSON content', async () => {
    const payload = { currency: 'USD', vendorShipping: 179.16, lines: [{ artist: 'GORILLAZ', title: 'MOUNTAIN', format: 'LP', qty: 2, unitPrice: 24.75, extended: 49.5 }] };
    const fetchMock = jest.spyOn(global, 'fetch' as any).mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify(payload) } }] }),
    } as any);

    const out = await new OpenRouterInvoiceParser().extract('...invoice text...');

    expect(out.currency).toBe('USD');
    expect(out.lines).toHaveLength(1);
    const [url, opts] = fetchMock.mock.calls[0] as any;
    expect(url).toContain('/chat/completions');
    expect(JSON.parse(opts.body).response_format).toEqual({ type: 'json_object' });
  });

  it('throws when key missing', async () => {
    delete process.env.OPENROUTER_API_KEY;
    await expect(new OpenRouterInvoiceParser().extract('x')).rejects.toThrow(/OPENROUTER_API_KEY/);
  });

  it('throws when OpenRouter returns a non-OK status', async () => {
    jest.spyOn(global, 'fetch' as any).mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'rate limited',
    } as any);
    await expect(new OpenRouterInvoiceParser().extract('x')).rejects.toThrow(/429/);
  });

  it('throws when the model returns non-JSON content', async () => {
    jest.spyOn(global, 'fetch' as any).mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Sorry, I cannot help with that.' } }] }),
    } as any);
    await expect(new OpenRouterInvoiceParser().extract('x')).rejects.toThrow(/non-JSON/);
  });

  it('throws when the response has no content', async () => {
    jest.spyOn(global, 'fetch' as any).mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [] }),
    } as any);
    await expect(new OpenRouterInvoiceParser().extract('x')).rejects.toThrow(/no content/);
  });
});

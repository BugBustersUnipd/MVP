import { ResultAiAssistantSerializer } from './result-ai-assistant.serializer';

describe('ResultAiAssistantSerializer', () => {
  let serializer: ResultAiAssistantSerializer;

  beforeEach(() => {
    serializer = new ResultAiAssistantSerializer();
  });

  it('should serialize object payload with mapped fields', () => {
    const result = serializer.serialize([
      {
        id: 77,
        title: 'Titolo',
        content: 'Contenuto',
        imagePath: 'img.png',
        toneID: 1,
        toneName: 'Formale',
        styleID: 2,
        styleName: 'Sintetico',
        companyID: 3,
        companyName: 'ACME',
        data: '2025-01-01T00:00:00.000Z',
        prompt: 'Prompt',
        evaluation: 4,
        isPost: false,
      },
    ]);

    expect(result.id).toBe(77);
    expect(result.title).toBe('Titolo');
    expect(result.tone.name).toBe('Formale');
    expect(result.style.name).toBe('Sintetico');
    expect(result.company.name).toBe('ACME');
    expect(result.generatedDatumId).toBe(0);
  });

  it('should fallback on invalid values and default isPost to true', () => {
    const result = serializer.serialize([
      {
        id: 'bad',
        title: 10,
        content: null,
        imagePath: undefined,
        toneID: 'x',
        styleID: 'y',
        companyID: 'z',
        data: 'not-a-date',
        prompt: null,
        evaluation: 'bad',
      },
    ] as any);

    expect(result.id).toBe(0);
    expect(result.title).toBe('');
    expect(result.content).toBe('');
    expect(result.tone.id).toBe(0);
    expect(result.style.id).toBe(0);
    expect(result.company.id).toBe(0);
    expect(result.data.getTime()).toBe(new Date(0).getTime());
    expect(result.generatedDatumId).toBeDefined();
  });

  it('should support legacy positional payload format', () => {
    const result = serializer.serialize([
      1,
      'Titolo legacy',
      'Contenuto legacy',
      'img-legacy',
      { id: 1, name: 'Tone' },
      { id: 2, name: 'Style' },
      '2025-01-01',
      'Prompt legacy',
      5,
    ] as any);

    expect(result.id).toBe(1);
    expect(result.title).toBe('Titolo legacy');
    expect(result.content).toBe('Contenuto legacy');
    expect(result.imagePath).toBe('img-legacy');
    expect(result.prompt).toBe('Prompt legacy');
    expect(result.evaluation).toBe(5);
    expect(result.tone.id).toBe(0);
    expect(result.style.id).toBe(0);
  });

  it('should deserialize to transport object array', () => {
    const source = serializer.serialize([
      {
        id: 9,
        title: 'T',
        content: 'C',
        imagePath: 'img',
        toneID: 1,
        toneName: 'A',
        styleID: 2,
        styleName: 'B',
        companyID: 3,
        companyName: 'C',
        data: '2025-01-01T00:00:00.000Z',
        prompt: 'P',
        evaluation: 2,
        isPost: true,
      },
    ]);

    const serialized = serializer.deserialize(source);
    expect(Array.isArray(serialized)).toBe(true);
    expect((serialized[0] as any).id).toBe(9);
    expect((serialized[0] as any).title).toBe('T');
    expect((serialized[0] as any).prompt).toBe('P');
  });
});

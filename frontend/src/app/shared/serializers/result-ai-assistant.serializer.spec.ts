import { ResultAiAssistantSerializer } from './result-ai-assistant.serializer';
import { ResultAiAssistant } from '../models/result-ai-assistant.model';

describe('ResultAiAssistantSerializer', () => {
  let serializer: ResultAiAssistantSerializer;

  beforeEach(() => {
    serializer = new ResultAiAssistantSerializer();
  });

  it('should serialize a create post request', () => {
    const payload = serializer.serializeCreatePostRequest({
      id: 7,
      title: 'Titolo',
      content: 'Corpo',
      imagePath: '/img.png',
      tone: { id: 1, name: 'Formale', isActive: true },
      style: { id: 2, name: 'Sintetico', isActive: true },
      company: { id: 3, name: 'ACME' },
      data: new Date('2025-01-01T00:00:00.000Z'),
      prompt: 'Prompt',
      evaluation: 4,
      generatedDatumId: 9,
    } as ResultAiAssistant);

    expect(payload).toEqual({
      generated_datum_id: 9,
      title: 'Titolo',
      body_text: 'Corpo',
      img_path: '/img.png',
      date_time: new Date('2025-01-01T00:00:00.000Z'),
    });
  });

  it('should deserialize generated datum id responses', () => {
    expect(serializer.deserializeCreatePostResponseId({ id: 12 })).toBe(12);
    expect(serializer.deserializeCreatePostResponseId({ generated_datum_id: 15 })).toBe(0);
    expect(serializer.deserializeCreatePostResponseId(null)).toBe(0);
  });

  it('should serialize generation requests with ids', () => {
    expect(
      serializer.serializeRequireGenerationRequest(
        'Prompt',
        { id: 1, name: 'Formale', isActive: true },
        { id: 2, name: 'Sintetico', isActive: true },
        { id: 3, name: 'ACME' }
      )
    ).toEqual({
      generation_datum: {
        prompt: 'Prompt',
        company_id: 3,
        style_id: 2,
        tone_id: 1,
      },
    });
  });
});

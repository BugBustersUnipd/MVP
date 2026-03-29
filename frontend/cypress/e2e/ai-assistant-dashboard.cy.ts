describe('Analytics Dashboard - AI Assistant Generativo', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/ai_generator_data_analyst*', {
      statusCode: 200,
      body: {
        status: 'ok',
        data: {
          prompt_amount: 120,
          average_rate_prompt: 4.6,
          average_regeneration_amount: 2,
          tone_usage: {
            Formale: 52,
            Professionale: 40,
            Informale: 28,
          },
          style_usage: {
            Tecnico: 49,
            Sintetico: 41,
            Narrativo: 30,
          },
        },
      },
    }).as('getAiAssistantAnalytics')

    cy.intercept('GET', '**/ai_copilot_data_analyst*', {
      statusCode: 200,
      body: {
        status: 'ok',
        data: {
          average_confidence: 95,
          average_human_intervention: 11,
          mapping_accuracy: 92,
          average_time_analyses: 8,
        },
      },
    }).as('getAiCopilotAnalytics')

    cy.visit('/analytics-dashboard')
    cy.wait('@getAiAssistantAnalytics')
    cy.wait('@getAiCopilotAnalytics')
  })

  it('mostra la dashboard con i dati analytics dell AI Assistant', () => {
    cy.contains('p-accordion-header', 'Ai Assistant Generativo').should('be.visible')
    cy.contains('.label', 'Quando:').should('exist')
  })

  it('mostra totale prompt, rating medio e numero rigenerazioni', () => {
    cy.contains('.item .label', 'N. PROMPT GENERATI')
      .should('exist')
      .closest('.item')
      .find('.data-value')
      .should('contain.text', '120')

    cy.contains('.item .label', 'RATING MEDIO PROMPT')
      .should('exist')
      .closest('.item')
      .find('.data-value')
      .should('contain.text', '4.6')

    cy.contains('.item .label', 'N. RIGENERAZIONI MEDIE PER PROMPT')
      .should('exist')
      .closest('.item')
      .find('.data-value')
      .should('contain.text', '2')
  })

  it('mostra le statistiche su toni e stili piu usati', () => {
    cy.contains('.chart .label', 'Toni').should('exist')
    cy.contains('.Chart .label', 'Stili').should('exist')
    cy.get('app-analytics-charts canvas').should('have.length.at.least', 2)
  })
})

describe('Analytics Dashboard - fallback grafici AI Assistant', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/ai_generator_data_analyst*', {
      statusCode: 200,
      body: {
        status: 'ok',
        data: {
          prompt_amount: 10,
          average_rate_prompt: 4.1,
          average_regeneration_amount: 1,
          tone_usage: {},
          style_usage: {},
        },
      },
    }).as('getAiAssistantAnalyticsEmptyCharts')

    cy.intercept('GET', '**/ai_copilot_data_analyst*', {
      statusCode: 200,
      body: {
        status: 'ok',
        data: {
          average_confidence: 95,
          average_human_intervention: 11,
          mapping_accuracy: 92,
          average_time_analyses: 8,
        },
      },
    }).as('getAiCopilotAnalytics')

    cy.visit('/analytics-dashboard')
    cy.wait('@getAiAssistantAnalyticsEmptyCharts')
    cy.wait('@getAiCopilotAnalytics')
  })

  it('mostra il messaggio di dati insufficienti quando i grafici toni e stili sono vuoti', () => {
    cy.contains('.chart .label', 'Toni').should('exist')
    cy.contains('.Chart .label', 'Stili').should('exist')
    cy.get('.Charts-Container .no-data-message')
      .should('have.length', 2)
      .each(($el) => {
        cy.wrap($el).should('contain.text', 'Non ci sono dati sufficienti per le analisi')
      })
    cy.get('app-analytics-charts canvas').should('have.length.at.least', 2)
  })
})

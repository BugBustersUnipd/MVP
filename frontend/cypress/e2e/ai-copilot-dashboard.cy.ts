describe('Analytics Dashboard - AI Co-Pilot', () => {
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
					},
					style_usage: {
						Tecnico: 49,
						Sintetico: 41,
					},
				},
			},
		}).as('getAiAssistantAnalytics')

		cy.intercept('GET', '**/ai_copilot_data_analyst*', (req) => {
			const hasDateRange = Boolean(req.query['start_date']) && Boolean(req.query['end_date'])

			if (hasDateRange) {
				req.alias = 'getAiCopilotAnalyticsFiltered'
				req.reply({
					statusCode: 200,
					body: {
						status: 'ok',
						data: {
							average_confidence: 88,
							average_human_intervention: 15,
							mapping_accuracy: 84,
							average_time_analyses: 12,
						},
					},
				})
				return
			}

			req.reply({
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
			})
		}).as('getAiCopilotAnalytics')

		cy.visit('/analytics-dashboard')
		cy.wait('@getAiAssistantAnalytics')
		cy.wait('@getAiCopilotAnalytics')
		cy.contains('p-accordion-header', 'Ai Co-Pilot').click({ force: true })
	})

	it('mostra la dashboard con i dati analytics dell AI Co-Pilot', () => {
		cy.contains('p-accordion-header', 'Ai Co-Pilot').should('be.visible')
		cy.contains('.item .label', 'PERCENTUALE CONFIDENZA MEDIA').should('be.visible')
		cy.contains('.item .label', 'PERCENTUALE HUMAN-IN-THE-LOOP').should('be.visible')
		cy.contains('.item .label', 'ACCURATEZZA MAPPING').should('be.visible')
		cy.contains('.item .label', 'TEMPI MEDI ANALISI').should('be.visible')
	})

	it('mostra la confidenza media delle analisi documenti', () => {
		cy.contains('.item .label', 'PERCENTUALE CONFIDENZA MEDIA')
			.should('be.visible')
			.closest('.item')
			.find('.data-value')
			.invoke('text')
			.should('match', /^95(00)?%$/)
	})

	it('mostra la percentuale di interventi manuali necessari', () => {
		cy.contains('.item .label', 'PERCENTUALE HUMAN-IN-THE-LOOP')
			.should('be.visible')
			.closest('.item')
			.find('.data-value')
			.should('have.text', '11%')
	})

	it('mostra l accuratezza del mapping dei dati', () => {
		cy.contains('.item .label', 'ACCURATEZZA MAPPING')
			.should('be.visible')
			.closest('.item')
			.find('.data-value')
			.should('have.text', '92%')
	})

	it('mostra i tempi medi di analisi dei documenti', () => {
		cy.contains('.item .label', 'TEMPI MEDI ANALISI')
			.should('be.visible')
			.closest('.item')
			.find('.data-value')
			.should('have.text', '8s')
	})

	it('permette di filtrare i dati analytics per periodo temporale', () => {
		cy.get('app-date-range-picker').eq(1).within(() => {
			cy.get('.p-select').click({ force: true })
		})

		cy.contains('.p-select-option', 'Questo mese').click({ force: true })

		cy.wait('@getAiCopilotAnalyticsFiltered').then((interception) => {
			expect(interception.request.query['start_date']).to.exist
			expect(interception.request.query['end_date']).to.exist
		})

		cy.contains('.item .label', 'PERCENTUALE CONFIDENZA MEDIA')
			.closest('.item')
			.find('.data-value')
			.invoke('text')
			.should('match', /^88(00)?%$/)

		cy.contains('.item .label', 'PERCENTUALE HUMAN-IN-THE-LOOP')
			.closest('.item')
			.find('.data-value')
			.should('have.text', '15%')

		cy.contains('.item .label', 'ACCURATEZZA MAPPING')
			.closest('.item')
			.find('.data-value')
			.should('have.text', '84%')

		cy.contains('.item .label', 'TEMPI MEDI ANALISI')
			.closest('.item')
			.find('.data-value')
			.should('have.text', '12s')
	})
})

describe('AI Assistant Generativo - generatore e risultato', () => {
	const company = { id: 1, name: 'Azienda Demo' }
	const tone = { id: 10, name: 'Formale' }
	const style = { id: 20, name: 'Tecnico' }
	const longPrompt =
		'Genera un contenuto professionale per la comunicazione interna aziendale con obiettivi chiari, tono coerente e call to action finale efficace.'

	const openSelectAndChoose = (label: string, optionName: string) => {
		cy.contains('label.label', label)
			.parent()
			.within(() => {
				cy.get('.p-select').first().click({ force: true })
			})

		cy.contains('.p-select-option', optionName, { timeout: 10000 }).click({ force: true })
		cy.get('body').click(0, 0, { force: true })
	}

	beforeEach(() => {
		cy.intercept('GET', '**/lookups/companies*', {
			statusCode: 200,
			body: {
				companies: [company],
			},
		}).as('getCompanies')

		cy.intercept('GET', '**/tones*', {
			statusCode: 200,
			body: { tones: [tone] },
		}).as('getTones')

		cy.intercept('GET', '**/styles*', {
			statusCode: 200,
			body: { styles: [style] },
		}).as('getStyles')

		cy.intercept('POST', '**/generated_data*', {
			statusCode: 200,
			body: {
				id: 777,
			},
		}).as('generateContent')

		cy.visit('/generatore', {
			onBeforeLoad(win) {
				class FakeWebSocket {
					onopen: ((event: Event) => void) | null = null
					onmessage: ((event: MessageEvent) => void) | null = null
					onclose: ((event: CloseEvent) => void) | null = null
					onerror: ((event: Event) => void) | null = null

					constructor(_url: string, _protocols?: string | string[]) {
						setTimeout(() => {
							this.onopen?.(new Event('open'))
						}, 0)
					}

					send(_data: string) {
						setTimeout(() => {
							this.onmessage?.({
								data: JSON.stringify({ type: 'confirm_subscription' }),
							} as MessageEvent)
						}, 0)

						setTimeout(() => {
							this.onmessage?.({
								data: JSON.stringify({
									message: {
										id: 777,
										status: 'completed',
										title: 'Titolo generato AI',
										text: 'Contenuto testuale generato in base a prompt e parametri.',
										image_url: '/uploads/generated-image.png',
									},
								}),
							} as MessageEvent)
						}, 20)
					}

					close() {
						this.onclose?.({
							code: 1000,
							reason: 'closed',
							wasClean: true,
						} as CloseEvent)
					}
				}

				Object.defineProperty(win, 'WebSocket', {
					writable: true,
					value: FakeWebSocket,
				})
			},
		})

		cy.wait('@getCompanies')
	})

	it('permette l inserimento di un prompt testuale per la generazione', () => {
		cy.get('textarea#Prompt').should('be.visible').clear().type(longPrompt)
		cy.get('textarea#Prompt').should('have.value', longPrompt)
	})

	it('permette la selezione del tono per la generazione del contenuto', () => {
		openSelectAndChoose('Aziende', company.name)
		cy.wait('@getTones')
		cy.wait('@getStyles')

		openSelectAndChoose('Toni', tone.name)
		cy.contains('label.label', 'Toni').parent().should('contain.text', tone.name)
	})

	it('permette la selezione dello stile per la generazione del contenuto', () => {
		openSelectAndChoose('Aziende', company.name)
		cy.wait('@getTones')
		cy.wait('@getStyles')

		openSelectAndChoose('Stili', style.name)
		cy.contains('label.label', 'Stili').parent().should('contain.text', style.name)
	})

	it('genera contenuti testuali in base a prompt e parametri e apre la pagina risultato-generazione', () => {
		openSelectAndChoose('Aziende', company.name)
		cy.wait('@getTones')
		cy.wait('@getStyles')

		openSelectAndChoose('Toni', tone.name)
		openSelectAndChoose('Stili', style.name)
		cy.get('textarea#Prompt').clear().type(longPrompt)

		cy.contains('button', 'Genera').click({ force: true })

		cy.wait('@generateContent').then((interception) => {
			expect(interception.request.body).to.deep.equal({
				generation_datum: {
					prompt: longPrompt,
					company_id: company.id,
					style_id: style.id,
					tone_id: tone.id,
				},
			})
		})

		cy.url().should('include', '/risultato-generazione')
		cy.contains('span', 'PARAMETRI INSERITI').should('exist')
		cy.contains('label.label', 'Tono').parent().should('contain.text', tone.name)
		cy.contains('label.label', 'Stile').parent().should('contain.text', style.name)
		cy.get('textarea#Prompt').should('have.value', longPrompt)
		cy.get('p-editor .ql-editor').should('be.visible')
		cy.get('bb-image-title p-image img').should('be.visible')
		cy.contains('Contenuto testuale generato in base a prompt e parametri.').should('be.visible')
	})
})

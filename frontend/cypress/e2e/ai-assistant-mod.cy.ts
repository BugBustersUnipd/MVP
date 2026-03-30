describe('AI Assistant - modifiche e azioni contenuto', () => {
	const company = { id: 1, name: 'Nexum' }
	const tone = { id: 10, name: 'Formale' }
	const style = { id: 20, name: 'Tecnico' }

	const unsavedResult = {
		id: null,
		generatedDatumId: 501,
		title: 'Titolo iniziale AI',
		content: 'Contenuto iniziale generato da AI.',
		imagePath: 'http://localhost:3000/uploads/preview.png',
		tone,
		style,
		company,
		data: '2026-03-30T10:30:00+01:00',
		prompt:
			'Genera una comunicazione interna dettagliata che includa obiettivi, contenuti operativi e call to action finale.',
		evaluation: 2,
	}

	const openSelectAndChoose = (label: string, optionName: string) => {
		cy.contains('label.label', label)
			.parent()
			.within(() => {
				cy.get('.p-select').click({ force: true })
			})

		cy.contains('.p-select-option', optionName).click({ force: true })
		cy.get('body').click(0, 0, { force: true })
	}

	const installFakeWebSocket = (win: Window, nextGenerationId = 900, generatedText = 'Contenuto rigenerato') => {
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
					this.onmessage?.({ data: JSON.stringify({ type: 'confirm_subscription' }) } as MessageEvent)
				}, 0)

				setTimeout(() => {
					this.onmessage?.({
						data: JSON.stringify({
							message: {
								id: nextGenerationId,
								status: 'completed',
								title: 'Titolo rigenerato AI',
								text: generatedText,
								image_url: '/uploads/rigenerata.png',
							},
						}),
					} as MessageEvent)
				}, 20)
			}

			close() {
				this.onclose?.({ code: 1000, reason: 'closed', wasClean: true } as CloseEvent)
			}
		}

		Object.defineProperty(win, 'WebSocket', {
			writable: true,
			value: FakeWebSocket,
		})
	}

	const visitResultPage = (result = unsavedResult, wsText = 'Contenuto rigenerato') => {
		cy.visit('/risultato-generazione', {
			onBeforeLoad(win) {
				installFakeWebSocket(win, 900, wsText)
				win.history.replaceState({ result }, '', '/risultato-generazione')
			},
		})
	}

	const setupGeneratorBase = () => {
		cy.intercept('GET', '**/lookups/companies*', {
			statusCode: 200,
			body: { companies: [company] },
		}).as('getCompanies')

		cy.intercept('GET', '**/tones*', {
			statusCode: 200,
			body: { tones: [tone, { id: 11, name: 'Informale' }] },
		}).as('getTones')

		cy.intercept('GET', '**/styles*', {
			statusCode: 200,
			body: { styles: [style, { id: 21, name: 'Narrativo' }] },
		}).as('getStyles')

		cy.visit('/generatore')
		cy.wait('@getCompanies')
		openSelectAndChoose('Aziende', company.name)
		cy.wait('@getTones')
		cy.wait('@getStyles')
	}

	it('mostra un anteprima del contenuto generato dall AI', () => {
		visitResultPage()

		cy.get('bb-image-title p-image img').should('have.attr', 'src').and('include', '/uploads/preview.png')
		cy.get('p-editor .ql-editor').should('contain.text', unsavedResult.content)
	})

	it('permette di modificare l immagine associata al contenuto generato', () => {
		visitResultPage()

		cy.contains('button', 'Modifica').click({ force: true })

		const pngBase64 =
			'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sY9wtsAAAAASUVORK5CYII='

		cy.get('input[type="file"]').selectFile(
			{
				contents: Cypress.Buffer.from(pngBase64, 'base64'),
				fileName: 'nuova-immagine.png',
				mimeType: 'image/png',
			},
			{ force: true },
		)

		cy.get('bb-image-title p-image img').should('have.attr', 'src').and('contain', 'data:image/png;base64')
	})

	it('notifica l utente quando tenta di caricare un file immagine non valido', () => {
		visitResultPage()
		cy.contains('button', 'Modifica').click({ force: true })

		cy.get('input[type="file"]').should('have.attr', 'accept', 'image/*')

		cy.get('input[type="file"]').selectFile(
			{
				contents: Cypress.Buffer.from('file non valido', 'utf8'),
				fileName: 'non-valido.txt',
				mimeType: 'text/plain',
			},
			{ force: true },
		)

		cy.get('bb-image-title p-image img').should('have.attr', 'src').and('not.contain', 'data:text/plain')
	})

	it('permette di modificare il titolo del contenuto generato', () => {
		visitResultPage()
		cy.contains('button', 'Modifica').click({ force: true })

		cy.get('input[name="imageTitle"]').clear().type('Titolo modificato manualmente')
		cy.contains('button', 'Salva Modifiche').click({ force: true })

		cy.get('input[name="imageTitle"]').should('have.value', 'Titolo modificato manualmente')
	})

	it('permette di modificare il testo del corpo del contenuto generato', () => {
		visitResultPage()
		cy.contains('button', 'Modifica').click({ force: true })

		cy.get('p-editor .ql-editor').click().type('{selectAll}{backspace}Nuovo corpo del contenuto modificato.')
		cy.contains('button', 'Salva Modifiche').click({ force: true })

		cy.get('p-editor .ql-editor').should('contain.text', 'Nuovo corpo del contenuto modificato.')
	})

	it('permette di annullare le modifiche apportate al contenuto generato', () => {
		visitResultPage()
		cy.contains('button', 'Modifica').click({ force: true })

		cy.get('input[name="imageTitle"]').clear().type('Titolo da annullare')
		cy.get('p-editor .ql-editor').click().type('{selectAll}{backspace}Contenuto da annullare')
		cy.contains('button', 'Annulla Modifiche').click({ force: true })

		cy.get('input[name="imageTitle"]').should('have.value', unsavedResult.title)
		cy.get('p-editor .ql-editor').should('contain.text', unsavedResult.content)
	})

	it('permette di rigenerare un contenuto tramite AI mantenendo i parametri', () => {
		cy.intercept('POST', '**/generated_data/501/regenerate', {
			statusCode: 200,
			body: { id: 900 },
		}).as('regenerateContent')

		visitResultPage(unsavedResult, 'Contenuto rigenerato mantenendo i parametri')
		cy.contains('button', 'Rigenera').click({ force: true })

		cy.wait('@regenerateContent')
		cy.contains('label.label', 'Tono').parent().should('contain.text', unsavedResult.tone.name)
		cy.contains('label.label', 'Stile').parent().should('contain.text', unsavedResult.style.name)
		cy.get('textarea#Prompt').should('have.value', unsavedResult.prompt)
		cy.get('p-editor .ql-editor').should('contain.text', 'Contenuto rigenerato mantenendo i parametri')
	})

	it('permette all utente di valutare rating il contenuto generato', () => {
		cy.intercept('PATCH', '**/generated_data/501/rating', {
			statusCode: 200,
			body: { ok: true },
		}).as('setRating')

		visitResultPage()

		cy.get('app-valutazione .p-rating .p-rating-option').eq(3).click({ force: true })
		cy.wait('@setRating').its('request.body').should('deep.equal', { rating: 4 })
	})

	it('permette di scartare il contenuto generato e pulire l interfaccia', () => {
		visitResultPage()

		cy.get('app-dialog button').click({ force: true })
		cy.contains('button', 'Conferma').click({ force: true })

		cy.url().should('include', '/generatore')
		cy.get('textarea#Prompt').should('have.value', '')
	})

	it('permette di salvare il contenuto generato nel database', () => {
		cy.intercept('POST', '**/posts', {
			statusCode: 200,
			body: { id: 901 },
		}).as('savePost')

		visitResultPage()
		cy.contains('button', 'Salva').click({ force: true })

		cy.wait('@savePost')
		cy.contains('button', 'Elimina').should('exist')
	})

	it('permette all utente l inserimento di un nuovo tono per la generazione di contenuti', () => {
		setupGeneratorBase()

		cy.intercept('POST', '**/tones', {
			statusCode: 200,
			body: { id: 99, name: 'Istituzionale' },
		}).as('createTone')

		cy.contains('label.label', 'Toni').parent().within(() => {
			cy.get('.p-select').click({ force: true })
		})
		cy.contains('button', 'Nuovo tono').click({ force: true })

		cy.get('#add-name').type('Istituzionale')
		cy.get('#add-description').type('Tono istituzionale per comunicazioni formali')
		cy.contains('button', 'Salva tono').click({ force: true })

		cy.wait('@createTone')
		cy.contains('label.label', 'Toni').parent().within(() => {
			cy.get('.p-select').click({ force: true })
		})
		cy.contains('.p-select-option', 'Istituzionale').should('exist')
	})

	it('permette all utente l eliminazione di un tono per la generazione di contenuti', () => {
		setupGeneratorBase()

		cy.intercept('DELETE', '**/tones/10', {
			statusCode: 200,
			body: { ok: true },
		}).as('deleteTone')

		cy.contains('label.label', 'Toni').parent().within(() => {
			cy.get('.p-select').click({ force: true })
		})
		cy.contains('.p-select-option', 'Formale')
			.find('button')
			.click({ force: true })

		cy.wait('@deleteTone')
	})

	it('permette all utente l inserimento di un nuovo stile per la generazione di contenuti', () => {
		setupGeneratorBase()

		cy.intercept('POST', '**/styles', {
			statusCode: 200,
			body: { id: 199, name: 'Ispirazionale' },
		}).as('createStyle')

		cy.contains('label.label', 'Stili').parent().within(() => {
			cy.get('.p-select').click({ force: true })
		})
		cy.contains('button', 'Nuovo stile').click({ force: true })

		cy.get('#add-name').type('Ispirazionale')
		cy.get('#add-description').type('Stile ispirazionale orientato al coinvolgimento')
		cy.contains('button', 'Salva stile').click({ force: true })

		cy.wait('@createStyle')
		cy.contains('label.label', 'Stili').parent().within(() => {
			cy.get('.p-select').click({ force: true })
		})
		cy.contains('.p-select-option', 'Ispirazionale').should('exist')
	})

	it('permette all utente l eliminazione di uno stile per la generazione di contenuti', () => {
		setupGeneratorBase()

		cy.intercept('DELETE', '**/styles/20', {
			statusCode: 200,
			body: { ok: true },
		}).as('deleteStyle')

		cy.contains('label.label', 'Stili').parent().within(() => {
			cy.get('.p-select').click({ force: true })
		})
		cy.contains('.p-select-option', 'Tecnico')
			.find('button')
			.click({ force: true })

		cy.wait('@deleteStyle')
	})
})

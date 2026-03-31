describe('AI Co-Pilot - messaggistica e invio documenti', () => {
	const uploads = [
		{ id: 7001, original_filename: 'cedolino-marzo.pdf', page_count: 3 },
		{ id: 7002, original_filename: 'contratto-aprile.pdf', page_count: 2 },
	]

	const extractedRows = {
		first: {
			id: 8001,
			uploaded_document_id: 7001,
			status: 'done',
			confidence: 0.91,
			matched_employee: {
				id: 301,
				name: 'Mario Rossi',
				email: 'mario.rossi@nexum.it',
				employee_code: 'EMP301',
			},
			process_time_seconds: 8,
			page_start: 1,
			page_end: 2,
			created_at: '2026-03-30T09:00:00+01:00',
			metadata: {
				category: 'Cedolino',
				company: 'Nexum',
				department: 'HR',
				month_year: '03/2026',
			},
		},
		second: {
			id: 8002,
			uploaded_document_id: 7002,
			status: 'done',
			confidence: 0.74,
			matched_employee: {
				id: 302,
				name: 'Giulia Bianchi',
				email: 'giulia.bianchi@acme.it',
				employee_code: 'EMP302',
			},
			process_time_seconds: 6,
			page_start: 1,
			page_end: 1,
			created_at: '2026-03-29T11:00:00+01:00',
			metadata: {
				category: 'Contratto',
				company: 'Acme',
				department: 'Legal',
				month_year: '03/2026',
			},
		},
	}

	const templates = [
		{ id: 1, subject: 'TMP-001 | Oggetto Cedolino', body: 'Testo template cedolino standard.' },
		{ id: 2, subject: 'TMP-002 | Oggetto Contratto', body: 'Testo template contratto standard.' },
	]

	const resultState = {
		id: 8001,
		parentId: 7001,
		name: 'cedolino-marzo.pdf',
		state: 'Pronto',
		confidence: 91,
		recipientId: 301,
		recipientName: 'Mario Rossi',
		recipientEmail: 'mario.rossi@nexum.it',
		recipientCode: 'EMP301',
		time_Analysis: 8,
		page_start: 1,
		page_end: 2,
		company: 'Nexum',
		department: 'HR',
		month_year: '03/2026',
		category: 'Cedolino',
		data: '2026-03-30T09:00:00+01:00',
	}

	const setupRiconoscimentoInterceptors = () => {
		cy.intercept('GET', '**/documents/uploads', {
			statusCode: 200,
			body: { uploaded_documents: uploads },
		}).as('getUploads')

		cy.intercept('GET', '**/documents/uploads/7001/extracted', {
			statusCode: 200,
			body: {
				uploaded_document: uploads[0],
				extracted_documents: [extractedRows.first],
			},
		}).as('getExtracted7001')

		cy.intercept('GET', '**/documents/uploads/7002/extracted', {
			statusCode: 200,
			body: {
				uploaded_document: uploads[1],
				extracted_documents: [extractedRows.second],
			},
		}).as('getExtracted7002')

		cy.intercept('GET', '**/lookups/companies*', {
			statusCode: 200,
			body: {
				companies: [
					{ id: 1, name: 'Nexum' },
					{ id: 2, name: 'Acme' },
				],
			},
		}).as('getCompanies')
	}

	const setupAnteprimaInterceptors = () => {
		cy.intercept('GET', '**/templates', {
			statusCode: 200,
			body: {
				templates: templates.map((t) => ({ id: t.id, subject: t.subject })),
			},
		}).as('getTemplates')

		cy.intercept('GET', '**/templates/1', {
			statusCode: 200,
			body: { template: templates[0] },
		}).as('getTemplate1')

		cy.intercept('GET', '**/templates/2', {
			statusCode: 200,
			body: { template: templates[1] },
		}).as('getTemplate2')

		cy.intercept('GET', '**/documents/extracted/8001', {
			statusCode: 200,
			body: { extracted_document: extractedRows.first },
		}).as('getExtractedDetail')

		cy.intercept('GET', '**/documents/uploads/7001/extracted', {
			statusCode: 200,
			body: {
				uploaded_document: uploads[0],
				extracted_documents: [extractedRows.first],
			},
		}).as('getSiblings')

		cy.intercept('GET', '**/lookups/users*', {
			statusCode: 200,
			body: {
				users: [
					{ id: 301, name: 'Mario Rossi', email: 'mario.rossi@nexum.it', employee_code: 'EMP301' },
					{ id: 399, name: 'Marco Verdi', email: 'marco.verdi@nexum.it', employee_code: 'EMP399' },
				],
			},
		}).as('getUsers')

		cy.intercept('POST', '**/sendings', {
			statusCode: 200,
			body: { id: 1, status: 'ok' },
		}).as('createSending')

		cy.intercept('POST', '**/templates', {
			statusCode: 200,
			body: { template: { id: 99, subject: 'TMP-099 | Nuovo', body: 'Nuovo testo template' } },
		}).as('createTemplate')
	}

	const visitRiconoscimento = () => {
		setupRiconoscimentoInterceptors()
		cy.visit('/riconoscimento-documenti')
		cy.wait('@getUploads')
		cy.wait('@getExtracted7001')
		cy.wait('@getExtracted7002')
		cy.wait('@getCompanies')
	}

	const visitAnteprima = () => {
		setupAnteprimaInterceptors()
		cy.visit('/anteprima-documento', {
			onBeforeLoad(win) {
				win.history.replaceState({ result: resultState, pages: 3 }, '', '/anteprima-documento')
			},
		})
		cy.wait('@getTemplates')
		cy.wait('@getTemplate1')
		cy.wait('@getTemplate2')
		cy.wait('@getExtractedDetail')
		cy.wait('@getSiblings')
	}

	const openSendDialog = () => {
		cy.contains('button', 'Invia il documento').click({ force: true })
		cy.get('.p-dialog').should('be.visible')
	}

	const chooseTemplate = (name: string) => {
		cy.get('.p-dialog').within(() => {
			cy.contains('label.label', 'Template').parent().find('.p-select').click({ force: true })
		})
		cy.contains('.p-select-option', name).click({ force: true })
	}

	it('mostra l appartenenza alle liste di distribuzione', () => {
		visitAnteprima()

		cy.contains('h3', 'Destinatario estratto').should('be.visible')
		cy.contains('td', 'Mario Rossi').should('be.visible')
		cy.contains('td', 'EMP301').should('be.visible')
		cy.contains('td', 'mario.rossi@nexum.it').should('be.visible')
	})

	it('mostra lo stato di elaborazione del documento', () => {
		visitRiconoscimento()

		cy.contains('span', 'Stato:').should('be.visible')
		cy.contains('span', 'Completato').should('be.visible')
	})

	it('permette di caricare un template di messaggio esistente', () => {
		visitAnteprima()
		openSendDialog()

		chooseTemplate('TMP-001 | Oggetto Cedolino')
		cy.get('.p-dialog textarea#Prompt').should('have.value', 'Testo template cedolino standard.')
	})

	it('permette di modificare l oggetto del messaggio', () => {
		visitAnteprima()
		openSendDialog()

		chooseTemplate('TMP-002 | Oggetto Contratto')
		cy.get('.p-dialog').within(() => {
			cy.contains('label.label', 'Template').parent().should('contain.text', 'TMP-002 | Oggetto Contratto')
		})
	})

	it('permette di modificare il testo del corpo del messaggio', () => {
		visitAnteprima()
		openSendDialog()

		cy.get('.p-dialog textarea#Prompt').clear().type('Corpo messaggio personalizzato dal Co-Pilot.')
		cy.get('.p-dialog textarea#Prompt').should('have.value', 'Corpo messaggio personalizzato dal Co-Pilot.')
	})

	it('permette di salvare il messaggio corrente come nuovo template', () => {
		visitAnteprima()
		openSendDialog()

		cy.get('.p-dialog').within(() => {
			cy.contains('label.label', 'Template').parent().find('.p-select').click({ force: true })
		})
		cy.contains('button', 'Nuovo template').click({ force: true })
		cy.get('#add-name').type('TMP-099 | Nuovo')
		cy.get('#add-description').type('Nuovo testo template')
		cy.contains('button', 'Salva template').click({ force: true })

		cy.wait('@createTemplate')
	})

	it('permette di eliminare un template di messaggio', () => {
		visitAnteprima()
		openSendDialog()

		cy.get('.p-dialog').within(() => {
			cy.contains('label.label', 'Template').parent().find('.p-select').click({ force: true })
		})
		cy.contains('.p-select-option', 'TMP-001 | Oggetto Cedolino').find('button').should('be.visible')
	})

	it('mostra la lista dei template di messaggio disponibili', () => {
		visitAnteprima()
		openSendDialog()

		cy.get('.p-dialog').within(() => {
			cy.contains('label.label', 'Template').parent().find('.p-select').click({ force: true })
		})
		cy.get('.p-select-option').should('have.length', templates.length)
		cy.contains('.p-select-option', 'TMP-001 | Oggetto Cedolino').should('be.visible')
		cy.contains('.p-select-option', 'TMP-002 | Oggetto Contratto').should('be.visible')
	})

	it('mostra un elemento della lista dei template disponibili', () => {
		visitAnteprima()
		openSendDialog()

		cy.get('.p-dialog').within(() => {
			cy.contains('label.label', 'Template').parent().find('.p-select').click({ force: true })
		})
		cy.contains('.p-select-option', 'TMP-001 | Oggetto Cedolino').click({ force: true })
		cy.get('.p-dialog textarea#Prompt').should('have.value', 'Testo template cedolino standard.')
	})

	it('mostra l oggetto del template', () => {
		visitAnteprima()
		openSendDialog()

		chooseTemplate('TMP-001 | Oggetto Cedolino')
		cy.get('.p-dialog').should('contain.text', 'TMP-001 | Oggetto Cedolino')
	})

	it('mostra il testo del template', () => {
		visitAnteprima()
		openSendDialog()

		chooseTemplate('TMP-002 | Oggetto Contratto')
		cy.get('.p-dialog textarea#Prompt').should('have.value', 'Testo template contratto standard.')
	})

	it('mostra il codice del template', () => {
		visitAnteprima()
		openSendDialog()

		cy.get('.p-dialog').within(() => {
			cy.contains('label.label', 'Template').parent().find('.p-select').click({ force: true })
		})
		cy.contains('.p-select-option', 'TMP-001 | Oggetto Cedolino').should('be.visible')
	})

	it('permette l invio del documento e del messaggio associato', () => {
		visitAnteprima()
		openSendDialog()

		cy.get('.p-dialog textarea#Prompt').clear().type('Messaggio associato al documento da inviare.')
		cy.contains('.p-dialog button', 'Conferma invio').click({ force: true })

		cy.wait('@createSending').then((interception) => {
			expect(interception.request.body.extracted_document_id).to.equal(8001)
			expect(interception.request.body.recipient_id).to.equal(301)
			expect(interception.request.body.body).to.equal('Messaggio associato al documento da inviare.')
		})
	})

	it('permette di allegare ulteriore contenuto al messaggio', () => {
		visitAnteprima()
		openSendDialog()

		cy.get('.p-dialog input[type="file"]').selectFile(
			{
				contents: Cypress.Buffer.from('allegato di esempio', 'utf8'),
				fileName: 'allegato.txt',
				mimeType: 'text/plain',
			},
			{ force: true },
		)

		cy.get('.p-dialog').should('contain.text', 'allegato.txt')
	})

	it('permette di pianificare l invio del documento e del messaggio associato', () => {
		visitAnteprima()
		openSendDialog()

		cy.get('.p-dialog .p-select').eq(1).click({ force: true })
		cy.contains('.p-select-option', 'Domani alle 9:00').click({ force: true })
		cy.contains('.p-dialog button', 'Conferma invio').click({ force: true })

		cy.wait('@createSending').then((interception) => {
			const sentAt = new Date(interception.request.body.sent_at)
			const now = new Date()
			expect(sentAt.getTime()).to.be.greaterThan(now.getTime())
		})
	})

	it('permette il filtraggio della lista dei documenti analizzati', () => {
		visitRiconoscimento()

		cy.get('input[placeholder="Cerca per tutto"]').clear().type('Mario Rossi')
		cy.get('p-table tbody tr').should('have.length', 1)
		cy.contains('span', 'cedolino-marzo.pdf').should('be.visible')
		cy.contains('span', 'contratto-aprile.pdf').should('not.exist')
	})

	it('mostra la lista dei documenti aggiornata in base ai filtri', () => {
		visitRiconoscimento()

		cy.get('input[placeholder="Cerca per tutto"]').clear().type('Mario Rossi')
		cy.contains('span', 'cedolino-marzo.pdf').should('be.visible')
		cy.contains('span', 'contratto-aprile.pdf').should('not.exist')

		cy.get('input[placeholder="Cerca per tutto"]').clear().type('Giulia Bianchi')
		cy.contains('span', 'contratto-aprile.pdf').should('be.visible')
		cy.contains('span', 'cedolino-marzo.pdf').should('not.exist')
	})

	it('permette il filtraggio della lista dei destinatari', () => {
		visitAnteprima()

		cy.get('.extracted-employee-info-card').within(() => {
			cy.contains('button', 'Modifica').click({ force: true })
		})

		cy.wait('@getUsers')
		cy.get('.select-employees-dialog .p-select').click({ force: true })
		cy.get('.p-select-filter').type('Marco')
		cy.contains('.p-select-option', 'Marco Verdi').should('be.visible')
		cy.contains('.p-select-option', 'Mario Rossi').should('not.exist')
	})

	it('mostra la lista dei destinatari aggiornata in base ai filtri', () => {
		visitAnteprima()

		cy.get('.extracted-employee-info-card').within(() => {
			cy.contains('button', 'Modifica').click({ force: true })
		})

		cy.wait('@getUsers')
		cy.get('.select-employees-dialog .p-select').click({ force: true })
		cy.get('.p-select-filter').type('Mario')
		cy.contains('.p-select-option', 'Mario Rossi').should('be.visible')
		cy.contains('.p-select-option', 'Marco Verdi').should('not.exist')
	})

	it('permette di mostrare l audit di un documento nello storico', () => {
		visitRiconoscimento()

		cy.get('p-accordion-header').first().click({ force: true })
		cy.get('p-table tbody tr').first().within(() => {
			cy.get('td').last().find('button').click({ force: true })
		})
		cy.contains('.p-menu-item-link', 'Modifica').click({ force: true })

		cy.url().should('include', '/anteprima-documento')
		cy.contains('label', 'Confidenza media').should('be.visible')
		cy.contains('label', 'ID documento splittato').should('be.visible')
	})
})

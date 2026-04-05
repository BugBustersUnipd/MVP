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
				name: 'cedolino-marzo.pdf',
				type: 'Cedolino',
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
				name: 'contratto-aprile.pdf',
				type: 'Contratto',
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
		cy.intercept('GET', '**/sendings*', {
			statusCode: 200,
			body: { sendings: [] },
		}).as('getSendings')

		cy.intercept('GET', '**/lookups/companies*', {
			statusCode: 200,
			body: {
				companies: [
					{ id: 1, name: 'Nexum' },
					{ id: 2, name: 'Acme' },
				],
			},
		}).as('getCompanies')

		cy.intercept('POST', '**/documents/split', {
			statusCode: 200,
			body: {
				uploaded_document_id: 7001,
			},
		}).as('uploadSplit')

		cy.intercept('GET', '**/documents/uploads/7001/extracted', {
			statusCode: 200,
			body: {
				uploaded_document: uploads[0],
				extracted_documents: [extractedRows.first],
			},
		}).as('getExtracted7001')
	}

	const visitRiconoscimento = () => {
		setupRiconoscimentoInterceptors()
		cy.visit('/estrattore')
		cy.wait('@getCompanies')
		cy.contains('label.label', 'Categoria').parent().find('input').clear().type('Cedolino')
		cy.get('input#monthYearInput').invoke('val', '03/26').trigger('input').trigger('change')
		cy.contains('label.label', 'Azienda').parent().find('.p-select').click({ force: true })
		cy.contains('.p-select-option', 'Nexum').click({ force: true })
		cy.contains('label.label', 'Reparto').parent().find('input').clear().type('HR')

		cy.get('input[type="file"]').first().selectFile(
			{
				contents: Cypress.Buffer.from('%PDF-1.4 mock', 'utf8'),
				fileName: 'cedolino-marzo.pdf',
				mimeType: 'application/pdf',
			},
			{ force: true },
		)
		cy.contains('button', 'Carica').click({ force: true })
		cy.wait('@uploadSplit')
		cy.wait('@getExtracted7001')
		cy.url().should('include', '/riconoscimento-documenti')
	}

	const setupAnteprimaInterceptors = () => {
		cy.intercept('GET', '**/sendings*', {
			statusCode: 200,
			body: { sendings: [] },
		}).as('getSendings')

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

	const visitAnteprima = () => {
		setupAnteprimaInterceptors()
		cy.visit('/anteprima-documento', {
			onBeforeLoad(win) {
				win.history.replaceState({ result: resultState, pages: 3 }, '', '/anteprima-documento')
			},
		})
		cy.wait('@getTemplates')
		cy.wait('@getSendings')
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
		cy.contains('h3', 'Destinatario estratto').should('exist')
		cy.contains('span.matched-field-value', 'Mario Rossi').should('exist')
		cy.contains('span.matched-field-value', 'EMP301').should('exist')
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

	it('permette di modificare il testo del corpo del messaggio', () => {
		visitAnteprima()
		openSendDialog()
		cy.get('.p-dialog textarea#Prompt').clear().type('Corpo messaggio personalizzato dal Co-Pilot.')
		cy.get('.p-dialog textarea#Prompt').invoke('val').should('contain', 'Corpo messaggio')
	})

	it('permette di salvare il messaggio corrente come nuovo template', () => {
		visitAnteprima()
		openSendDialog()
		cy.get('.p-dialog').within(() => {
			cy.contains('label.label', 'Template').parent().find('.p-select').click({ force: true })
		})
		cy.contains('button', 'Nuovo template').click({ force: true })
		cy.get('body').click(0, 0, { force: true })
		cy.get('#add-name').type('TMP-099 | Nuovo', { force: true })
		cy.get('#add-description').type('Nuovo testo template', { force: true })
		cy.contains('button', 'Salva template').click({ force: true })
		cy.wait('@createTemplate')
	})

	it('permette il filtraggio della lista dei documenti analizzati', () => {
		visitRiconoscimento()
		cy.get('input[placeholder="Cerca per tutto"]').clear().type('Mario Rossi')
		cy.get('p-accordion-panel').should('have.length', 1)
		cy.contains('span', 'cedolino-marzo.pdf').should('exist')
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

	it('permette di mostrare l audit di un documento nello storico', () => {
		setupAnteprimaInterceptors()
		visitRiconoscimento()
		cy.get('p-accordion-header').first().click({ force: true })
		cy.get('p-table tbody tr').first().within(() => {
			cy.get('td').last().find('button').click({ force: true })
		})
		cy.contains('.p-menu-item-link', 'Modifica').click({ force: true })
		cy.url().should('include', '/anteprima-documento')
		cy.contains('label', 'Confidenza media').should('exist')
		cy.contains('label', 'ID documento splittato').should('exist')
	})
})

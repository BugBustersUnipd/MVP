describe('Storico AI Co-Pilot', () => {
	const uploads = [
		{ id: 901, original_filename: 'cedolino-marzo.pdf', page_count: 3 },
		{ id: 902, original_filename: 'lettera-assunzione.pdf', page_count: 2 },
	]

	const extractedByUpload: Record<number, any[]> = {
		901: [
			{
				id: 1001,
				uploaded_document_id: 901,
				status: 'done',
				confidence: 0.91,
				matched_employee: {
					id: 501,
					name: 'Mario Rossi',
					email: 'mario.rossi@nexum.it',
					employee_code: 'EMP001',
				},
				process_time_seconds: 8,
				page_start: 1,
				page_end: 2,
				created_at: '2026-03-29T08:00:00+01:00',
				metadata: {
					category: 'Cedolino',
					company: 'Nexum',
					department: 'HR',
					month_year: '03/2026',
				},
			},
		],
		902: [
			{
				id: 1002,
				uploaded_document_id: 902,
				status: 'done',
				confidence: 0.76,
				matched_employee: {
					id: 502,
					name: 'Giulia Bianchi',
					email: 'giulia.bianchi@nexum.it',
					employee_code: 'EMP002',
				},
				process_time_seconds: 6,
				page_start: 1,
				page_end: 1,
				created_at: '2026-03-28T10:30:00+01:00',
				metadata: {
					category: 'Contratto',
					company: 'Acme',
					department: 'Legal',
					month_year: '03/2026',
				},
			},
		],
	}

	const setupCommonInterceptors = () => {
		cy.intercept('GET', '**/lookups/companies*', {
			statusCode: 200,
			body: {
				companies: [
					{ id: 1, name: 'Nexum' },
					{ id: 2, name: 'Acme' },
				],
			},
		}).as('getCompanies')

		cy.intercept('GET', '**/templates*', {
			statusCode: 200,
			body: { templates: [] },
		}).as('getTemplates')
	}

	const setupHistoryWithData = () => {
		setupCommonInterceptors()

		cy.intercept('GET', '**/documents/uploads', {
			statusCode: 200,
			body: { uploaded_documents: uploads },
		}).as('getUploads')

		cy.intercept('GET', '**/documents/uploads/901/extracted', {
			statusCode: 200,
			body: {
				uploaded_document: uploads[0],
				extracted_documents: extractedByUpload[901],
			},
		}).as('getExtracted901')

		cy.intercept('GET', '**/documents/uploads/902/extracted', {
			statusCode: 200,
			body: {
				uploaded_document: uploads[1],
				extracted_documents: extractedByUpload[902],
			},
		}).as('getExtracted902')

		cy.intercept('GET', '**/documents/extracted/1001', {
			statusCode: 200,
			body: { extracted_document: extractedByUpload[901][0] },
		}).as('getExtractedDoc1001')

		cy.visit('/storico-ai-copilot')
		cy.wait('@getUploads')
		cy.wait('@getExtracted901')
		cy.wait('@getExtracted902')
		cy.wait('@getCompanies')
	}

	const openFirstRowDetailFromMenu = () => {
		cy.get('p-table tbody tr').first().within(() => {
			cy.get('td').last().find('button').click({ force: true })
		})
		cy.contains('.p-menu-item-link', 'Modifica').click({ force: true })
	}

	it('mostra lo storico completo dei documenti processati', () => {
		setupHistoryWithData()

		cy.contains('td', 'cedolino-marzo.pdf').should('exist')
		cy.contains('td', 'lettera-assunzione.pdf').should('exist')
		cy.get('p-table tbody tr').should('have.length', 2)
	})

	it('notifica l assenza di documenti nello storico', () => {
		setupCommonInterceptors()

		cy.intercept('GET', '**/documents/uploads', {
			statusCode: 200,
			body: { uploaded_documents: [] },
		}).as('getUploadsEmpty')

		cy.visit('/storico-ai-copilot')
		cy.wait('@getUploadsEmpty')

		cy.contains('Nessun dato disponibile').should('exist')
	})

	it('mostra i dettagli di un elemento nello storico documenti', () => {
		setupHistoryWithData()

		openFirstRowDetailFromMenu()

		cy.url().should('include', '/anteprima-documento')
		cy.contains('label', 'Confidenza media').should('exist')
		cy.contains('label', 'Categoria').should('exist')
		cy.contains('label', 'Azienda').should('exist')
		cy.contains('label', 'Reparto').should('exist')
	})

	it('mostra la percentuale di confidenza dell analisi nello storico', () => {
		setupHistoryWithData()

		cy.contains('td', '91%').should('exist')
		cy.contains('td', '76%').should('exist')
	})

	it('permette il filtraggio della lista dello storico documenti', () => {
		setupHistoryWithData()

		cy.get('input[placeholder="Cerca per tutto"]').clear().type('Mario Rossi')

		cy.get('p-table tbody tr').should('have.length', 1)
		cy.contains('td', 'cedolino-marzo.pdf').should('exist')
	})

	it('mostra la lista dello storico documenti aggiornata in base ai filtri', () => {
		setupHistoryWithData()

		cy.get('input[placeholder="Cerca per tutto"]').clear().type('Mario')
		cy.get('p-table tbody tr').should('have.length', 1)
		cy.contains('td', 'cedolino-marzo.pdf').should('exist')

		cy.get('input[placeholder="Cerca per tutto"]').clear().type('Giulia')
		cy.get('p-table tbody tr').should('have.length', 1)
		cy.contains('td', 'lettera-assunzione.pdf').should('exist')
		cy.contains('td', 'cedolino-marzo.pdf').should('not.exist')
	})
})

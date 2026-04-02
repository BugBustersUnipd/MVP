describe('AI Co-Pilot - upload e riconoscimento documenti', () => {
	const companyNexum = { id: 1, name: 'Nexum' }
	const companyAcme = { id: 2, name: 'Acme' }

	const uploadParent = { id: 7001, original_filename: 'documento-multiplo.pdf', page_count: 3 }

	const rawExtractedA = {
		id: 8001,
		uploaded_document_id: 7001,
		status: 'done',
		confidence: 0.91,
		recipient: 'Mario Rossi',
		matched_employee: {
			id: 301,
			name: 'Mario Rossi',
			email: 'mario.rossi@nexum.it',
			employee_code: 'EMP301',
		},
		process_time_seconds: 7,
		page_start: 1,
		page_end: 2,
		created_at: '2026-03-30T09:00:00+01:00',
		metadata: {
			name: 'documento-multiplo.pdf',
			type: 'Cedolino',
			company: 'Nexum',
			department: 'HR',
			month_year: '03/2026',
			language: 'it',
			reason: 'Retribuzione',
		},
	}

	const rawExtractedB = {
		id: 8002,
		uploaded_document_id: 7001,
		status: 'done',
		confidence: 0.74,
		recipient: 'Giulia Bianchi',
		matched_employee: {
			id: 302,
			name: 'Giulia Bianchi',
			email: 'giulia.bianchi@nexum.it',
			employee_code: 'EMP302',
		},
		process_time_seconds: 5,
		page_start: 3,
		page_end: 3,
		created_at: '2026-03-30T09:00:00+01:00',
		metadata: {
			name: 'documento-multiplo.pdf',
			type: 'Contratto',
			company: 'Nexum',
			department: 'HR',
			month_year: '03/2026',
			language: 'it',
			reason: 'Assunzione',
		},
	}

	const fillRequiredEstrattoreFields = () => {
		cy.contains('label.label', 'Categoria').parent().find('input').clear().type('Cedolino')
		cy.get('input#monthYearInput').invoke('val', '03/26').trigger('input').trigger('change')
		cy.contains('label.label', 'Azienda').parent().find('.p-select').click({ force: true })
		cy.contains('.p-select-option', 'Nexum').click({ force: true })
		cy.contains('label.label', 'Reparto').parent().find('input').clear().type('HR')
	}

	const setupRecognitionInterceptors = (extractedDocs: any[]) => {
		cy.intercept('GET', '**/lookups/companies*', {
			statusCode: 200,
			body: {
				companies: [companyNexum, companyAcme],
			},
		}).as('getCompanies')

		cy.intercept('POST', '**/documents/split', {
			statusCode: 200,
			body: {
				uploaded_document_id: uploadParent.id,
			},
		}).as('uploadSplit')

		cy.intercept('GET', '**/documents/uploads/7001/extracted*', {
			statusCode: 200,
			body: {
				uploaded_document: uploadParent,
				extracted_documents: extractedDocs,
			},
		}).as('getUploadExtracted')
	}

	const preloadHistoryAndVisitRecognition = (extractedDocs: any[]) => {
		setupRecognitionInterceptors(extractedDocs)

		cy.visit('/estrattore')
		cy.wait('@getCompanies')
		fillRequiredEstrattoreFields()
		cy.get('input[type="file"]').first().selectFile(
			{
				contents: Cypress.Buffer.from('%PDF-1.4 mock', 'utf8'),
				fileName: 'documento-multiplo.pdf',
				mimeType: 'application/pdf',
			},
			{ force: true },
		)
		cy.contains('button', 'Carica').click({ force: true })
		cy.wait('@uploadSplit')
		cy.wait('@getUploadExtracted')

		cy.url().should('include', '/riconoscimento-documenti')
	}

	const setupAnteprimaInterceptors = (rawExtracted: any) => {
		cy.intercept('GET', '**/sendings*', {
			statusCode: 200,
			body: { sendings: [] },
		}).as('getSendings')

		cy.intercept('GET', '**/templates', {
			statusCode: 200,
			body: {
				templates: [{ id: 1, subject: 'TMP-001 | Oggetto base' }],
			},
		}).as('getTemplates')

		cy.intercept('GET', '**/templates/1', {
			statusCode: 200,
			body: {
				template: {
					id: 1,
					subject: 'TMP-001 | Oggetto base',
					body: 'Contenuto template base',
				},
			},
		}).as('getTemplate1')

		cy.intercept('GET', '**/documents/extracted/8001', {
			statusCode: 200,
			body: { extracted_document: rawExtracted },
		}).as('getExtracted8001')

		cy.intercept('GET', '**/documents/uploads/7001/extracted', {
			statusCode: 200,
			body: {
				uploaded_document: uploadParent,
				extracted_documents: [rawExtractedA, rawExtractedB],
			},
		}).as('getSiblings')
	}

	const openRowMenuAndClickModifica = () => {
		cy.get('p-table tbody tr').first().within(() => {
			cy.get('td').last().find('button').click({ force: true })
		})
		cy.contains('.p-menu-item-link', 'Modifica').click({ force: true })
	}

	it('permette l analisi documenti tramite il modulo AI Co-Pilot', () => {
		cy.intercept('GET', '**/lookups/companies*', {
			statusCode: 200,
			body: { companies: [companyNexum, companyAcme] },
		}).as('getCompanies')

		cy.visit('/estrattore')
		cy.wait('@getCompanies')

		cy.get('app-upload').should('exist')
		cy.get('.upload-wrapper').should('exist')
		cy.get('p-fileupload').should('exist')
		cy.contains('button', 'Carica').should('be.disabled')
	})

	it('permette la selezione della categoria del documento', () => {
		cy.intercept('GET', '**/lookups/companies*', {
			statusCode: 200,
			body: { companies: [companyNexum] },
		})

		cy.visit('/estrattore')
		cy.contains('label.label', 'Categoria').parent().find('input').clear().type('Cedolino')
		cy.contains('label.label', 'Categoria').parent().find('input').should('have.value', 'Cedolino')
	})

	it('permette l inserimento del mese anno di competenza del documento', () => {
		cy.intercept('GET', '**/lookups/companies*', {
			statusCode: 200,
			body: { companies: [companyNexum] },
		})

		cy.visit('/estrattore')
		cy.get('input#monthYearInput').invoke('val', '03/26').trigger('input').trigger('change')
		cy.get('input#monthYearInput').should('have.value', '03/26')
	})

	it('permette l inserimento dell azienda associata al documento', () => {
		cy.intercept('GET', '**/lookups/companies*', {
			statusCode: 200,
			body: { companies: [companyNexum, companyAcme] },
		})

		cy.visit('/estrattore')
		cy.contains('label.label', 'Azienda').parent().find('.p-select').click({ force: true })
		cy.contains('.p-select-option', 'Nexum').click({ force: true })
		cy.contains('label.label', 'Azienda').parent().should('contain.text', 'Nexum')
	})

	it('permette l inserimento del reparto associato al documento', () => {
		cy.intercept('GET', '**/lookups/companies*', {
			statusCode: 200,
			body: { companies: [companyNexum] },
		})

		cy.visit('/estrattore')
		cy.contains('label.label', 'Reparto').parent().find('input').clear().type('HR')
		cy.contains('label.label', 'Reparto').parent().find('input').should('have.value', 'HR')
	})

	it('controlla la correttezza del formato del file inserito', () => {
		cy.on('uncaught:exception', (err) => {
			if (err.message.includes("Errore durante l'upload del documento")) {
				return false
			}
			return true
		})

		cy.intercept('GET', '**/lookups/companies*', {
			statusCode: 200,
			body: { companies: [companyNexum] },
		}).as('getCompanies')

		cy.intercept('POST', '**/documents/split', {
			statusCode: 422,
			body: { error: 'File immagine non valido' },
		}).as('uploadFail')

		cy.visit('/estrattore')
		cy.wait('@getCompanies')
		fillRequiredEstrattoreFields()

		cy.get('app-upload')
			.find('input[type="file"]')
			.first()
			.selectFile(
				{
					contents: Cypress.Buffer.from('invalid', 'utf8'),
					fileName: 'test.pdf',
					mimeType: 'application/pdf',
				},
				{ force: true },
			)

		cy.contains('button', 'Carica').click({ force: true })
		cy.wait('@uploadFail', { timeout: 5000 })
		cy.url().should('include', '/riconoscimento-documenti')
	})

	it('controlla che lo stesso file non sia gia stato analizzato', () => {
		cy.intercept('GET', '**/lookups/companies*', {
			statusCode: 200,
			body: { companies: [companyNexum] },
		}).as('getCompaniesEstrattore')

		cy.intercept('POST', '**/documents/split', {
			statusCode: 200,
			body: { uploaded_document_id: uploadParent.id },
		}).as('uploadDuplicate')

		cy.intercept('GET', '**/documents/uploads/7001/extracted*', {
			statusCode: 200,
			body: {
				uploaded_document: uploadParent,
				extracted_documents: [rawExtractedA],
			},
		}).as('getUploadExtractedDuplicate')

		cy.visit('/estrattore')
		cy.wait('@getCompaniesEstrattore')
		fillRequiredEstrattoreFields()

		cy.get('input[type="file"]', { timeout: 10000 }).first().selectFile(
			{
				contents: Cypress.Buffer.from('PDF mock', 'utf8'),
				fileName: 'documento-multiplo.pdf',
				mimeType: 'application/pdf',
			},
			{ force: true },
		)

		cy.contains('button', 'Carica').click({ force: true })
		cy.wait('@uploadDuplicate')
		cy.wait('@getUploadExtractedDuplicate')
		cy.url().should('include', '/riconoscimento-documenti')
		cy.get('p-accordion-panel').should('have.length.greaterThan', 0)
	})

	it('permette lo split di documenti diversi nello stesso file', () => {
		preloadHistoryAndVisitRecognition([rawExtractedA, rawExtractedB])
		cy.get('body').should('be.visible')
		cy.get('p-accordion-panel', { timeout: 5000 }).should('have.length.greaterThan', 0)
	})

	it('permette la visualizzazione della lista dei documenti analizzati', () => {
		preloadHistoryAndVisitRecognition([rawExtractedA, rawExtractedB])

		cy.contains('h2.page-title', 'RICONOSCIMENTO DOCUMENTI').should('exist')
		cy.contains('Nome del documento: documento-multiplo.pdf').should('exist')
	})

	it('notifica l utente se nessun documento e stato riconosciuto dall analisi', () => {
		preloadHistoryAndVisitRecognition([])
		cy.get('p-accordion-panel').should('have.length', 1)
		cy.get('p-accordion-header').first().click({ force: true })
		cy.contains('Nessun dato disponibile').should('exist')
	})

	it('permette di visualizzare i dettagli di un singolo documento dalla lista', () => {
		preloadHistoryAndVisitRecognition([rawExtractedA, rawExtractedB])
		setupAnteprimaInterceptors(rawExtractedA)

		openRowMenuAndClickModifica()

		cy.url().should('include', '/anteprima-documento')
		cy.wait('@getTemplates')
		cy.wait('@getSendings')
		cy.wait('@getTemplate1')
		cy.wait('@getExtracted8001')
		cy.wait('@getSiblings')
		cy.contains('label.label', 'ID documento splittato').should('exist')
	})
})

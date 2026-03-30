describe('AI Co-Pilot - estrattore, riconoscimento-documenti e anteprima-documento', () => {
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
			category: 'Cedolino',
			company: 'Nexum',
			department: 'HR',
			month_year: '03/2026',
			language: 'it',
			cause: 'Retribuzione',
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
			category: 'Contratto',
			company: 'Nexum',
			department: 'HR',
			month_year: '03/2026',
			language: 'it',
			cause: 'Assunzione',
		},
	}

	const setupRecognitionInterceptors = (extractedDocs: any[]) => {
		cy.intercept('GET', '**/lookups/companies*', {
			statusCode: 200,
			body: {
				companies: [companyNexum, companyAcme],
			},
		}).as('getCompanies')

		cy.intercept('GET', '**/documents/uploads*', {
			statusCode: 200,
			body: {
				uploaded_documents: [uploadParent],
			},
		}).as('getUploads')

		cy.intercept('GET', '**/documents/uploads/7001/extracted*', {
			statusCode: 200,
			body: {
				uploaded_document: uploadParent,
				extracted_documents: extractedDocs,
			},
		}).as('getUploadExtracted')
	}

	const setupAnteprimaInterceptors = (rawExtracted: any) => {
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

		cy.contains('span.title', 'Carica uno o piu documenti').should('be.visible')
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
		cy.intercept('GET', '**/lookups/companies*', {
			statusCode: 200,
			body: { companies: [companyNexum] },
		})

		cy.visit('/estrattore')

		cy.get('input.native-file-input').first().selectFile(
			{
				contents: Cypress.Buffer.from('contenuto non valido', 'utf8'),
				fileName: 'file-non-valido.txt',
				mimeType: 'text/plain',
			},
			{ force: true },
		)

		cy.contains('File immagine non valido').should('be.visible')
	})

	it('controlla che lo stesso file non sia gia stato analizzato', () => {
		cy.intercept('GET', '**/lookups/companies*', {
			statusCode: 200,
			body: { companies: [companyNexum] },
		}).as('getCompaniesEstrattore')

		cy.intercept('POST', '**/documents/split', {
			statusCode: 409,
			body: { error: 'Documento gia analizzato' },
		}).as('uploadDuplicate')

		cy.intercept('GET', '**/documents/uploads*', {
			statusCode: 200,
			body: { uploaded_documents: [] },
		}).as('getUploadsEmpty')

		cy.visit('/estrattore')
		cy.wait('@getCompaniesEstrattore')

		cy.get('input.native-file-input').first().selectFile(
			{
				contents: Cypress.Buffer.from('PDF mock', 'utf8'),
				fileName: 'documento-multiplo.pdf',
				mimeType: 'application/pdf',
			},
			{ force: true },
		)

		cy.contains('button', 'Carica').click({ force: true })
		cy.wait('@uploadDuplicate')
		cy.wait('@getUploadsEmpty')

		cy.url().should('include', '/riconoscimento-documenti')
		cy.get('p-accordion-panel').should('have.length', 0)
	})

	it('permette lo split di documenti diversi nello stesso file', () => {
		setupRecognitionInterceptors([rawExtractedA, rawExtractedB])

		cy.visit('/riconoscimento-documenti')
		cy.wait('@getUploads')
		cy.wait('@getUploadExtracted')

		cy.get('p-accordion-panel').should('have.length', 1)
		cy.get('p-accordion-content p-table tbody tr').should('have.length', 2)
	})

	it('permette la visualizzazione della lista dei documenti analizzati', () => {
		setupRecognitionInterceptors([rawExtractedA, rawExtractedB])

		cy.visit('/riconoscimento-documenti')
		cy.wait('@getUploads')
		cy.wait('@getUploadExtracted')

		cy.contains('h2.page-title', 'RICONOSCIMENTO DOCUMENTI').should('be.visible')
		cy.contains('Nome del documento: documento-multiplo.pdf').should('be.visible')
	})

	it('notifica l utente se nessun documento e stato riconosciuto dall analisi', () => {
		cy.intercept('GET', '**/lookups/companies*', {
			statusCode: 200,
			body: { companies: [companyNexum] },
		})

		cy.intercept('POST', '**/documents/split', {
			statusCode: 200,
			body: {
				uploaded_document_id: 7001,
				job_id: 'job-empty',
			},
		})

		cy.intercept('GET', '**/documents/uploads*', {
			statusCode: 200,
			body: { uploaded_documents: [] },
		}).as('getUploadsAfterUpload')

		cy.intercept('GET', '**/documents/uploads/7001/extracted*', {
			statusCode: 200,
			body: {
				uploaded_document: uploadParent,
				extracted_documents: [],
			},
		})

		cy.visit('/estrattore')

		cy.get('input.native-file-input').first().selectFile(
			{
				contents: Cypress.Buffer.from('PDF mock', 'utf8'),
				fileName: 'documento-multiplo.pdf',
				mimeType: 'application/pdf',
			},
			{ force: true },
		)

		cy.contains('button', 'Carica').click({ force: true })
		cy.wait('@getUploadsAfterUpload')

		cy.url().should('include', '/riconoscimento-documenti')
		cy.contains('Nessun dato disponibile').should('be.visible')
	})

	it('permette di visualizzare i dettagli di un singolo documento dalla lista', () => {
		setupRecognitionInterceptors([rawExtractedA, rawExtractedB])
		setupAnteprimaInterceptors(rawExtractedA)

		cy.visit('/riconoscimento-documenti')
		cy.wait('@getUploads')
		cy.wait('@getUploadExtracted')

		openRowMenuAndClickModifica()

		cy.url().should('include', '/anteprima-documento')
		cy.wait('@getTemplates')
		cy.wait('@getTemplate1')
		cy.wait('@getExtracted8001')
		cy.wait('@getSiblings')
		cy.contains('label.label', 'ID documento splittato').should('be.visible')
	})

	it('mostra competenza periodo, azienda, causale tipologia, pagine, nome file originale, data e codice documento', () => {
		setupRecognitionInterceptors([rawExtractedA])
		setupAnteprimaInterceptors(rawExtractedA)

		cy.visit('/riconoscimento-documenti')
		cy.wait('@getUploads')
		cy.wait('@getUploadExtracted')

		cy.contains('Nome del documento: documento-multiplo.pdf').should('be.visible')
		cy.contains('30/03/2026').should('be.visible')
		cy.contains('td', 'Cedolino').should('be.visible')

		openRowMenuAndClickModifica()
		cy.wait('@getExtracted8001')

		cy.contains('label.label', 'Mese/Anno').should('be.visible')
		cy.contains('label.label', 'Azienda').should('be.visible')
		cy.contains('label.label', 'Categoria').should('be.visible')
		cy.contains('label.label', 'Pagine estratte').should('be.visible')
		cy.contains('label.label', 'ID documento splittato').should('be.visible')

		cy.contains('label.label', 'Mese/Anno').parent().find('input').should('have.value', '03/2026')
		cy.contains('label.label', 'Azienda').parent().find('input').should('have.value', 'Nexum')
		cy.contains('label.label', 'Categoria').parent().find('input').should('have.value', 'Cedolino')
	})

	it('mostra l anteprima visiva del documento analizzato tramite apertura documento originale e split', () => {
		setupAnteprimaInterceptors(rawExtractedA)

		cy.visit('/anteprima-documento', {
			onBeforeLoad(win) {
				cy.spy(win, 'open').as('windowOpen')
				win.history.replaceState(
					{
						result: {
							id: 8001,
							parentId: 7001,
							name: 'documento-multiplo.pdf',
							state: 'Pronto',
							confidence: 91,
							recipientId: 301,
							recipientName: 'Mario Rossi',
							recipientEmail: 'mario.rossi@nexum.it',
							recipientCode: 'EMP301',
							rawRecipientName: 'Mario Rossi',
							page_start: 1,
							page_end: 2,
							company: 'Nexum',
							department: 'HR',
							category: 'Cedolino',
							month_year: '03/2026',
							data: new Date('2026-03-30T09:00:00+01:00'),
							time_Analysis: 7,
							fieldConfidences: { recipient: 91, company: 89, type: 92 },
						},
						pages: 3,
					},
					'',
					'/anteprima-documento',
				)
			},
		})

		cy.wait('@getTemplates')
		cy.wait('@getTemplate1')
		cy.wait('@getExtracted8001')
		cy.wait('@getSiblings')

		cy.contains('button', 'Apri documento originale').click({ force: true })
		cy.contains('button', 'Apri documento').click({ force: true })

		cy.get('@windowOpen').should('have.callCount', 2)
	})

	it('permette di modificare il destinatario associato al documento', () => {
		setupAnteprimaInterceptors(rawExtractedA)

		cy.intercept('GET', '**/lookups/users*', {
			statusCode: 200,
			body: {
				users: [
					{ id: 301, name: 'Mario Rossi', email: 'mario.rossi@nexum.it', employee_code: 'EMP301' },
					{ id: 399, name: 'Marco Verdi', email: 'marco.verdi@nexum.it', employee_code: 'EMP399' },
				],
			},
		}).as('getUsers')

		cy.intercept('PATCH', '**/documents/extracted/8001/metadata', {
			statusCode: 200,
			body: {
				extracted_document: {
					...rawExtractedA,
					recipient: 'Marco Verdi',
					matched_employee: {
						id: 399,
						name: 'Marco Verdi',
						email: 'marco.verdi@nexum.it',
						employee_code: 'EMP399',
					},
				},
			},
		}).as('updateRecipient')

		cy.visit('/anteprima-documento', {
			onBeforeLoad(win) {
				win.history.replaceState(
					{
						result: {
							id: 8001,
							parentId: 7001,
							name: 'documento-multiplo.pdf',
							state: 'Pronto',
							confidence: 91,
							recipientId: 301,
							recipientName: 'Mario Rossi',
							recipientEmail: 'mario.rossi@nexum.it',
							recipientCode: 'EMP301',
							rawRecipientName: 'Mario Rossi',
							page_start: 1,
							page_end: 2,
							company: 'Nexum',
							department: 'HR',
							category: 'Cedolino',
							month_year: '03/2026',
							data: new Date('2026-03-30T09:00:00+01:00'),
							time_Analysis: 7,
							fieldConfidences: { recipient: 91, company: 89, type: 92 },
						},
						pages: 3,
					},
					'',
					'/anteprima-documento',
				)
			},
		})

		cy.wait('@getTemplates')
		cy.wait('@getTemplate1')
		cy.wait('@getExtracted8001')
		cy.wait('@getSiblings')

		cy.get('.extracted-employee-info-card').within(() => {
			cy.contains('button', 'Modifica').click({ force: true })
		})

		cy.wait('@getUsers')
		cy.get('.select-employees-dialog .p-select').click({ force: true })
		cy.contains('.p-select-option', 'Marco Verdi').click({ force: true })
		cy.contains('.select-employees-dialog button', 'Salva').click({ force: true })

		cy.wait('@updateRecipient').then((interception) => {
			expect(interception.request.body.metadata_updates.recipient).to.equal('Marco Verdi')
		})

		cy.contains('span.matched-field-value', 'Marco Verdi').should('be.visible')
		cy.contains('span.matched-field-value', 'EMP399').should('be.visible')
	})

	it('permette di modificare la tipologia del documento e ricalcola la confidenza dopo modifiche manuali', () => {
		setupAnteprimaInterceptors(rawExtractedA)

		cy.intercept('PATCH', '**/documents/extracted/8001/metadata', {
			statusCode: 200,
			body: {
				extracted_document: {
					...rawExtractedA,
					confidence: 0.76,
					metadata: {
						...rawExtractedA.metadata,
						category: 'Certificazione Unica',
					},
				},
			},
		}).as('updateTypeAndConfidence')

		cy.visit('/anteprima-documento', {
			onBeforeLoad(win) {
				win.history.replaceState(
					{
						result: {
							id: 8001,
							parentId: 7001,
							name: 'documento-multiplo.pdf',
							state: 'Pronto',
							confidence: 91,
							recipientId: 301,
							recipientName: 'Mario Rossi',
							recipientEmail: 'mario.rossi@nexum.it',
							recipientCode: 'EMP301',
							rawRecipientName: 'Mario Rossi',
							page_start: 1,
							page_end: 2,
							company: 'Nexum',
							department: 'HR',
							category: 'Cedolino',
							month_year: '03/2026',
							data: new Date('2026-03-30T09:00:00+01:00'),
							time_Analysis: 7,
							fieldConfidences: { recipient: 91, company: 89, type: 92 },
						},
						pages: 3,
					},
					'',
					'/anteprima-documento',
				)
			},
		})

		cy.wait('@getTemplates')
		cy.wait('@getTemplate1')
		cy.wait('@getExtracted8001')
		cy.wait('@getSiblings')

		cy.get('.confidence-pill').should('contain.text', '91')
		cy.contains('button', 'Modifica').click({ force: true })
		cy.contains('label.label', 'Categoria').parent().find('input').clear().type('Certificazione Unica')
		cy.contains('button', 'Salva Modifiche').click({ force: true })

		cy.wait('@updateTypeAndConfidence').then((interception) => {
			expect(interception.request.body.metadata_updates.category).to.equal('Certificazione Unica')
		})

		cy.contains('label.label', 'Categoria').parent().find('input').should('have.value', 'Certificazione Unica')
		cy.get('.confidence-pill').should('contain.text', '76')
	})

	it('mostra lista e dettagli del destinatario estratto con nome cognome e matricola', () => {
		setupAnteprimaInterceptors(rawExtractedA)

		cy.visit('/anteprima-documento', {
			onBeforeLoad(win) {
				win.history.replaceState(
					{
						result: {
							id: 8001,
							parentId: 7001,
							name: 'documento-multiplo.pdf',
							state: 'Pronto',
							confidence: 91,
							recipientId: 301,
							recipientName: 'Mario Rossi',
							recipientEmail: 'mario.rossi@nexum.it',
							recipientCode: 'EMP301',
							rawRecipientName: 'Mario Rossi',
							page_start: 1,
							page_end: 2,
							company: 'Nexum',
							department: 'HR',
							category: 'Cedolino',
							month_year: '03/2026',
							data: new Date('2026-03-30T09:00:00+01:00'),
							time_Analysis: 7,
							fieldConfidences: { recipient: 91, company: 89, type: 92 },
						},
						pages: 3,
					},
					'',
					'/anteprima-documento',
				)
			},
		})

		cy.wait('@getTemplates')
		cy.wait('@getTemplate1')
		cy.wait('@getExtracted8001')
		cy.wait('@getSiblings')

		cy.contains('h3', 'Destinatario estratto').should('be.visible')
		cy.contains('span.field-label', 'Destinatario matchato').should('be.visible')
		cy.contains('span.matched-field-label', 'Nominativo').should('be.visible')
		cy.contains('span.matched-field-value', 'Mario Rossi').should('be.visible')
		cy.contains('span.matched-field-label', 'Username').should('be.visible')
		cy.contains('span.matched-field-value', 'EMP301').should('be.visible')
	})

	it('notifica se nessun destinatario e stato riconosciuto', () => {
		const noRecipientRaw = {
			...rawExtractedA,
			recipient: '',
			matched_employee: null,
		}

		setupAnteprimaInterceptors(noRecipientRaw)

		cy.visit('/anteprima-documento', {
			onBeforeLoad(win) {
				win.history.replaceState(
					{
						result: {
							id: 8001,
							parentId: 7001,
							name: 'documento-multiplo.pdf',
							state: 'Pronto',
							confidence: 91,
							recipientId: 0,
							recipientName: '',
							recipientEmail: '',
							recipientCode: '',
							rawRecipientName: '',
							page_start: 1,
							page_end: 2,
							company: 'Nexum',
							department: 'HR',
							category: 'Cedolino',
							month_year: '03/2026',
							data: new Date('2026-03-30T09:00:00+01:00'),
							time_Analysis: 7,
							fieldConfidences: { recipient: 0, company: 89, type: 92 },
						},
						pages: 3,
					},
					'',
					'/anteprima-documento',
				)
			},
		})

		cy.wait('@getTemplates')
		cy.wait('@getTemplate1')
		cy.wait('@getExtracted8001')
		cy.wait('@getSiblings')

		cy.contains('Nessun destinatario estratto').should('be.visible')
		cy.contains('button', 'Invia il documento').should('be.disabled')
	})

	it('mostra lingua, codice fiscale e reparto del destinatario quando previsti dai requisiti', () => {
		setupAnteprimaInterceptors(rawExtractedA)

		cy.visit('/anteprima-documento', {
			onBeforeLoad(win) {
				win.history.replaceState(
					{
						result: {
							id: 8001,
							parentId: 7001,
							name: 'documento-multiplo.pdf',
							state: 'Pronto',
							confidence: 91,
							recipientId: 301,
							recipientName: 'Mario Rossi',
							recipientEmail: 'mario.rossi@nexum.it',
							recipientCode: 'EMP301',
							rawRecipientName: 'Mario Rossi',
							page_start: 1,
							page_end: 2,
							company: 'Nexum',
							department: 'HR',
							category: 'Cedolino',
							month_year: '03/2026',
							data: new Date('2026-03-30T09:00:00+01:00'),
							time_Analysis: 7,
							fieldConfidences: { recipient: 91, company: 89, type: 92 },
						},
						pages: 3,
					},
					'',
					'/anteprima-documento',
				)
			},
		})

		cy.wait('@getTemplates')
		cy.wait('@getTemplate1')
		cy.wait('@getExtracted8001')
		cy.wait('@getSiblings')

		cy.contains('Lingua').should('be.visible')
		cy.contains('Codice fiscale').should('be.visible')
		cy.contains('Reparto').should('be.visible')
	})
})

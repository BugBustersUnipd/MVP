describe('AI Co-Pilot - anteprima documento e destinatari', () => {
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

	const visitAnteprima = (rawExtracted = rawExtractedA) => {
		setupAnteprimaInterceptors(rawExtracted)

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
		cy.wait('@getSendings')
		cy.wait('@getTemplate1')
		cy.wait('@getExtracted8001')
		cy.wait('@getSiblings')
	}

	it('mostra competenza periodo, azienda, causale tipologia, pagine, nome file originale, data e codice documento', () => {
		visitAnteprima()

		cy.contains('label.label', 'Competenza').should('exist')
		cy.contains('label.label', 'Azienda').should('exist')
		cy.contains('label.label', 'Categoria').should('exist')
		cy.contains('label.label', 'Pagine estratte').should('exist')
		cy.contains('label.label', 'ID documento splittato').should('exist')

		cy.contains('label.label', 'Competenza').parent().find('input').should('have.value', '03/2026')
		cy.contains('label.label', 'Azienda').parent().find('input').should('have.value', 'Nexum')
		cy.contains('label.label', 'Categoria').parent().find('input').should('have.value', 'Cedolino')
	})

	it('mostra la causale del documento analizzato', () => {
		visitAnteprima()
		cy.contains('label.label', 'Ragione').should('exist')
		cy.contains('label.label', 'Ragione').parent().find('input').should('have.value', 'Retribuzione')
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

		visitAnteprima()

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

		cy.contains('span.matched-field-value', 'Marco Verdi').should('exist')
		cy.contains('span.matched-field-value', 'EMP399').should('exist')
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
						type: 'Certificazione Unica',
					},
				},
			},
		}).as('updateTypeAndConfidence')

		visitAnteprima()

		cy.get('.confidence-pill').should('contain.text', '91')
		cy.contains('button', 'Modifica').click({ force: true })
		cy.contains('label.label', 'Categoria').parent().find('input').clear().type('Certificazione Unica')
		cy.contains('button', 'Salva Modifiche').click({ force: true })

		cy.wait('@updateTypeAndConfidence').then((interception) => {
			expect(interception.request.body.metadata_updates.category).to.equal('Certificazione Unica')
		})

		cy.get('.confidence-pill').should('contain.text', '76')
	})

	it('mostra lista e dettagli del destinatario estratto con nome cognome e matricola', () => {
		visitAnteprima()

		cy.contains('h3', 'Destinatario estratto').should('exist')
		cy.contains('span.field-label', 'Destinatario matchato').should('exist')
		cy.contains('span.matched-field-label', 'Nominativo').should('exist')
		cy.contains('span.matched-field-value', 'Mario Rossi').should('exist')
		cy.contains('span.matched-field-label', 'Username').should('exist')
		cy.contains('span.matched-field-value', 'EMP301').should('exist')
	})

	it('notifica se nessun destinatario e stato riconosciuto', () => {
		const noRecipientRaw = {
			...rawExtractedA,
			recipient: '',
			matched_employee: null,
		}

		visitAnteprima(noRecipientRaw)

		cy.contains('Nessun destinatario estratto').should('exist')
		cy.contains('button', 'Invia il documento').should('be.disabled')
	})

	it('mostra il reparto del destinatario quando presente nei dati estratti', () => {
		visitAnteprima()
		cy.contains('label.label', 'Reparto').should('exist')
		cy.contains('label.label', 'Reparto').parent().find('input').should('have.value', 'HR')
	})
})

describe('Storico AI Assistant Generativo - visualizzazione', () => {
	const tones = [
		{ id: 10, name: 'Formale' },
		{ id: 11, name: 'Informale' },
	]

	const styles = [
		{ id: 20, name: 'Tecnico' },
		{ id: 21, name: 'Narrativo' },
	]

	const historyPosts = [
		{
			id: 101,
			title: 'Comunicazione Nuova Policy',
			body_text: 'Testo generato completo per policy aziendale e comunicazione interna.',
			img_path: '/uploads/policy.png',
			date_time: '2026-03-20T12:30:00+01:00',
			tone_id: 10,
			toneName: 'Formale',
			style_id: 20,
			styleName: 'Tecnico',
			company_id: 1,
			companyName: 'Nexum',
			prompt: 'Scrivi una comunicazione interna professionale sulla nuova policy aziendale.',
			evaluation: 4,
		},
		{
			id: 102,
			title: 'Lancio Iniziativa Team',
			body_text: 'Testo generato per annunciare la nuova iniziativa interna di team building.',
			img_path: '/uploads/team.png',
			date_time: '2026-03-15T09:10:00+01:00',
			tone_id: 11,
			toneName: 'Informale',
			style_id: 21,
			styleName: 'Narrativo',
			company_id: 1,
			companyName: 'Nexum',
			prompt: 'Crea un annuncio coinvolgente per una iniziativa di team building aziendale.',
			evaluation: 5,
		},
	]

	const mappedResult = {
		id: 101,
		title: 'Comunicazione Nuova Policy',
		content: 'Testo generato completo per policy aziendale e comunicazione interna.',
		imagePath: '/uploads/policy.png',
		tone: { id: 10, name: 'Formale' },
		style: { id: 20, name: 'Tecnico' },
		company: { id: 1, name: 'Nexum' },
		data: '2026-03-20T12:30:00+01:00',
		prompt: 'Scrivi una comunicazione interna professionale sulla nuova policy aziendale.',
		evaluation: 4,
		isPost: true,
	}

	const interceptReferenceData = () => {
		cy.intercept('GET', '**/lookups/companies*', {
			statusCode: 200,
			body: {
				companies: [{ id: 1, name: 'Nexum' }],
			},
		}).as('getCompanies')

		cy.intercept('GET', '**/tones*', {
			statusCode: 200,
			body: tones,
		}).as('getTones')

		cy.intercept('GET', '**/styles*', {
			statusCode: 200,
			body: styles,
		}).as('getStyles')
	}

	const visitStoricoWithPosts = (posts: any[]) => {
		interceptReferenceData()
		cy.intercept('GET', '**/posts*', {
			statusCode: 200,
			body: {
				posts,
			},
		}).as('getHistory')

		cy.visit('/storico-ai-assistant')
		cy.wait('@getCompanies')
		cy.wait('@getTones')
		cy.wait('@getStyles')
		cy.wait('@getHistory')
	}

	const visitResultWithState = () => {
		cy.visit('/risultato-generazione', {
			onBeforeLoad(win) {
				win.history.replaceState({ result: mappedResult }, '', '/risultato-generazione')
			},
		})
	}

	it('mostra la visualizzazione dello storico delle generazioni AI', () => {
		visitStoricoWithPosts(historyPosts)

		cy.get('p-table').should('be.visible')
		cy.get('p-table tbody tr').should('have.length', historyPosts.length)
		cy.contains('th', 'Titolo').should('be.visible')
		cy.contains('th', 'Prompt').should('be.visible')
	})

	it('notifica assenza elementi quando lo storico e vuoto', () => {
		visitStoricoWithPosts([])

		cy.contains('Nessun dato disponibile').should('be.visible')
		cy.get('p-table tbody tr').should('have.length', 1)
	})

	it('mostra i dettagli completi di un elemento selezionato dallo storico', () => {
		visitResultWithState()

		cy.contains('span', 'PARAMETRI INSERITI').should('exist')
		cy.contains('label.label', 'Tono').parent().should('contain.text', mappedResult.tone.name)
		cy.contains('label.label', 'Stile').parent().should('contain.text', mappedResult.style.name)
		cy.get('textarea#Prompt').should('have.value', mappedResult.prompt)
		cy.get('p-editor .ql-editor').should('be.visible')
		cy.contains('label.label', 'Contenuto').should('exist')
	})

	it('mostra lo stile utilizzato per un contenuto nello storico', () => {
		visitResultWithState()
		cy.contains('label.label', 'Stile').parent().should('contain.text', mappedResult.style.name)
	})

	it('mostra il testo del risultato generato nello storico', () => {
		visitResultWithState()
		cy.get('p-editor .ql-editor').should('contain.text', mappedResult.content)
	})

	it('mostra il timestamp della generazione nello storico', () => {
		visitResultWithState()
		cy.contains('label.label', 'Data di generazione:').should('exist')
		cy.get('.data-generazione span').invoke('text').should('match', /\d{2}\/\d{2}\/\d{4}/)
	})

	it('mostra la valutazione assegnata dall utente nello storico', () => {
		visitResultWithState()
		cy.get('app-valutazione').scrollIntoView().should('be.visible')
		cy.get('app-valutazione .p-rating').should('be.visible')
		cy.get('app-valutazione .p-rating .p-rating-option').should('have.length', 5)
	})

	it('mostra il prompt originale utilizzato per un contenuto nello storico', () => {
		visitResultWithState()
		cy.get('textarea#Prompt').should('have.value', mappedResult.prompt)
	})

	it('mostra il tono utilizzato per un contenuto nello storico', () => {
		visitResultWithState()
		cy.contains('label.label', 'Tono').parent().should('contain.text', mappedResult.tone.name)
	})
})

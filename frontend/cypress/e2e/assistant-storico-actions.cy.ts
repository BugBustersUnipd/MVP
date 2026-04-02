describe('Storico AI Assistant Generativo - azioni e filtri', () => {
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

	it('permette di riutilizzare i parametri di un contenuto dello storico per una nuova generazione', () => {
		visitResultWithState()

		cy.contains('button', 'Riutilizza').click({ force: true })
		cy.url().should('include', '/generatore')
	})

	it('permette di duplicare un contenuto dallo storico per modificarne i parametri', () => {
		visitResultWithState()

		cy.contains('button', 'Duplica').click({ force: true })
		cy.url().should('include', '/generatore')
		cy.get('textarea#Prompt').should('have.value', mappedResult.prompt)
	})

	it('permette di filtrare la lista delle generazioni nello storico', () => {
		visitStoricoWithPosts(historyPosts)

		cy.get('body').click(0, 0, { force: true })
		cy.get('input[placeholder="Cerca per tutto"]').clear({ force: true }).type('policy', { force: true })

		cy.get('p-table tbody tr').should('have.length', 1)
		cy.contains('a.truncate-content', historyPosts[0].title).should('be.visible')
	})

	it('mostra la lista dello storico aggiornata in base ai filtri applicati', () => {
		visitStoricoWithPosts(historyPosts)

		cy.get('body').click(0, 0, { force: true })
		cy.get('input[placeholder="Cerca per tutto"]').clear({ force: true }).type('policy', { force: true })
		cy.get('p-table tbody tr').should('have.length', 1)

		cy.get('input[placeholder="Cerca per tutto"]').clear({ force: true }).type('team', { force: true })
		cy.get('p-table tbody tr').should('have.length', 1)
	})
})

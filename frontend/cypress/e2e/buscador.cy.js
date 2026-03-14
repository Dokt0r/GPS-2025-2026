describe('Buscador de ingredientes', () => {

    it('Carga los ingredientes de la API', () => {
        cy.visit('http://localhost:5173');
        cy.get('input[placeholder="Ingrediente (ej: Arroz)"]')
            .should('exist');
    });

    it('Muestra sugerencias al escribir', () => {
        cy.intercept('GET', 'http://localhost:3000/api/ingredientes').as('getIngredientes');
        cy.visit('http://localhost:5173');
        cy.wait('@getIngredientes');
        cy.get('input[placeholder="Ingrediente (ej: Arroz)"]')
            .type('ace');
        cy.wait(500);
        cy.get('.sugerencias-box').should('exist');
        cy.get('.sugerencia-item').should('have.length.greaterThan', 0);
    });

    it('Selecciona un ingrediente y lo añade a la nevera', () => {
        cy.intercept('GET', 'http://localhost:3000/api/ingredientes').as('getIngredientes');
        cy.visit('http://localhost:5173');
        cy.wait('@getIngredientes');
        cy.get('input[placeholder="Ingrediente (ej: Arroz)"]')
            .type('aceite');
        cy.wait(500);
        cy.get('.sugerencia-item').first().click();
        cy.get('button').contains('Confirmar Selección').click();
        cy.get('#mi-nevera').should('contain', 'Aceite');
    });

});
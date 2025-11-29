describe('PDF Viewer E2E Tests', () => {
  it('should load the home screen', () => {
    cy.visit('/');
    cy.get('.home-screen').should('be.visible');
  });

  it('should open a PDF file', () => {
    cy.fixture('test-config.json').then((config) => {
      cy.openPdf(config.pdfPath).then((result) => {
        expect(result.success).to.be.true;
      });
    });
  });

  it('should add a bookmark', () => {
    cy.fixture('test-config.json').then((config) => {
      cy.openPdf(config.pdfPath);
      cy.addBookmark(config.pdfPath, 1, 'Test Bookmark').then((result) => {
        expect(result.success).to.be.true;
      });
    });
  });

  it('should retrieve bookmarks', () => {
    cy.fixture('test-config.json').then((config) => {
      cy.getBookmarks(config.pdfPath).then((result) => {
        expect(result.success).to.be.true;
        expect(result.bookmarks).to.be.an('array');
      });
    });
  });

  describe('Recent PDFs Management', () => {
    // Variable pour stocker l'état initial
    let initialRecentPdfs = [];
    let initialPdfCount = 0;

    beforeEach(() => {
      // Capturer l'état initial
      cy.get('.home-screen').should('be.visible');

      cy.window().then((win) => {
        return win.electronAPI.getRecentPdfs();
      }).then((result) => {
        if (result.success && result.recentPdfs) {
          initialRecentPdfs = [...result.recentPdfs];
          initialPdfCount = result.recentPdfs.length;
        }
      });
    });

    it('should remove the first PDF from the list and verify config is updated', () => {
      // Prérequis : S'assurer qu'il y a au moins un PDF récent
      cy.window().then((win) => {
        return win.electronAPI.getRecentPdfs();
      }).then((result) => {
        expect(result.success).to.be.true;
        expect(result.recentPdfs).to.be.an('array');
        expect(result.recentPdfs.length).to.be.greaterThan(0, 'La liste des PDFs récents doit contenir au moins un élément pour ce test');
      });

      // Étape 1 : Récupérer le chemin du premier PDF à retirer
      let removedPdfPath;
      let initialPdfCount;

      cy.window().then((win) => {
        return win.electronAPI.getRecentPdfs();
      }).then((result) => {
        initialPdfCount = result.recentPdfs.length;
        const firstPdf = result.recentPdfs[0];
        removedPdfPath = typeof firstPdf === 'object' && firstPdf.path ? firstPdf.path : firstPdf;
        
        cy.log(`PDF à retirer : ${removedPdfPath}`);
        cy.log(`Nombre initial de PDFs : ${initialPdfCount}`);
      });

      // Attendre que l'UI se mette à jour
      cy.wait(1000);

      // Étape 2 : Vérifier que la liste des PDFs est affichée dans l'UI
      cy.get('.pdf-list').should('be.visible');
      cy.get('.pdf-item').should('have.length.greaterThan', 0);

      // Stocker le nombre initial d'éléments UI
      cy.get('.pdf-item').its('length').then((uiCount) => {
        expect(uiCount).to.equal(initialPdfCount);
      });

      // Étape 3 : Cliquer sur le bouton "🗑️ Retirer" du premier PDF
      cy.get('.pdf-item').first().within(() => {
        cy.get('.btn-danger').contains('Retirer').should('be.visible').click();
      });

      // Étape 4 : Vérifier que le modal de confirmation apparaît avec le bon contenu
      cy.get('.confirm-overlay', { timeout: 1000 }).should('be.visible');
      cy.get('.confirm-modal').should('be.visible');
      cy.get('.confirm-modal h3').should('contain', 'Retirer ce PDF');
      cy.get('.confirm-modal p').first().should('contain', 'toutes les données associées');
      cy.get('.confirm-modal .confirm-note').should('contain', 'Le fichier PDF restera sur votre disque');

      // Vérifier que les deux boutons sont présents
      cy.get('.confirm-modal .btn-secondary').contains('Annuler').should('be.visible');
      cy.get('.confirm-modal .btn-danger').contains('Retirer').should('be.visible');

      // Étape 5 : Confirmer le retrait en cliquant sur le bouton "Retirer" du modal
      cy.get('.confirm-modal .btn-danger').contains('Retirer').click();

      // Étape 6 : Vérifier que le modal se ferme
      cy.get('.confirm-overlay', { timeout: 1000 }).should('not.exist');
      cy.get('.confirm-modal').should('not.exist');

      // Étape 7 : Vérifier que l'élément a disparu de l'UI
      // Attendre que le DOM soit mis à jour
      cy.wait(500); // Petit délai pour laisser React mettre à jour le DOM

      // Si c'était le dernier PDF, vérifier l'affichage de l'état vide
      cy.window().then((win) => {
        return win.electronAPI.getRecentPdfs();
      }).then((result) => {
        if (result.recentPdfs.length === 0) {
          // État vide : vérifier l'affichage du message "Aucun PDF récent"
          cy.get('.empty-state').should('be.visible');
          cy.get('.empty-state p').first().should('contain', 'Aucun PDF récent');
        } else {
          // Il reste des PDFs : vérifier que le nombre a diminué
          cy.get('.pdf-item').should('have.length', result.recentPdfs.length);
        }
      });

      // Étape 8 : Vérifier dans la config via IPC que le PDF a été retiré
      cy.window().then((win) => {
        return win.electronAPI.getRecentPdfs();
      }).then((result) => {
        expect(result.success).to.be.true;
        
        // Vérifier que la liste a diminué d'un élément
        expect(result.recentPdfs.length).to.equal(initialPdfCount - 1);
        
        // Vérifier que le PDF retiré n'est plus dans la liste
        const pdfPaths = result.recentPdfs.map((pdf) => {
          return typeof pdf === 'object' && pdf.path ? pdf.path : pdf;
        });
        
        expect(pdfPaths).to.not.include(removedPdfPath);
        
        cy.log(`✅ Vérification réussie : ${removedPdfPath} n'est plus dans la config`);
        cy.log(`✅ Nombre de PDFs après suppression : ${result.recentPdfs.length}`);
      });

      // Étape 9 : NOUVEAU - Vérifier que les bookmarks du PDF retiré ont été supprimés
      cy.window().then((win) => {
        return win.electronAPI.getBookmarks(removedPdfPath);
      }).then((result) => {
        expect(result.success).to.be.true;
        expect(result.bookmarks).to.be.an('array');
        expect(result.bookmarks.length).to.equal(0, 'Les bookmarks du PDF retiré doivent être supprimés');
        
        cy.log(`✅ Vérification bookmarks : la liste est vide pour ${removedPdfPath}`);
      });
    });



    it('should cancel PDF removal when clicking Cancel button', () => {
      // Prérequis : S'assurer qu'il y a au moins un PDF récent
      cy.window().then((win) => {
        return win.electronAPI.getRecentPdfs();
      }).then((result) => {
        expect(result.success).to.be.true;
        expect(result.recentPdfs.length).to.be.greaterThan(0);
      });

      // Récupérer l'état initial
      let initialPdfCount;
      cy.get('.pdf-item').its('length').then((count) => {
        initialPdfCount = count;
      });

      // Cliquer sur le bouton "Retirer" du premier PDF
      cy.get('.pdf-item').first().within(() => {
        cy.get('.btn-danger').contains('Retirer').click();
      });

      // Vérifier que le modal apparaît
      cy.get('.confirm-overlay').should('be.visible');
      cy.get('.confirm-modal').should('be.visible');

      // Cliquer sur le bouton "Annuler"
      cy.get('.confirm-modal .btn-secondary').contains('Annuler').click();

      // Vérifier que le modal se ferme
      cy.get('.confirm-overlay').should('not.exist');
      cy.get('.confirm-modal').should('not.exist');

      // Vérifier que le PDF est toujours présent
      cy.get('.pdf-item').should('have.length', initialPdfCount);

      // Vérifier via IPC que rien n'a changé
      cy.window().then((win) => {
        return win.electronAPI.getRecentPdfs();
      }).then((result) => {
        expect(result.recentPdfs.length).to.equal(initialPdfCount);
        cy.log(`✅ Annulation réussie : ${initialPdfCount} PDFs toujours présents`);
      });
    });

    it('should handle empty state after removing all PDFs', () => {
      // Ce test supprime tous les PDFs un par un et vérifie l'état vide final
      
      function removeFirstPdf() {
        return cy.get('.pdf-item').first().within(() => {
          cy.get('.btn-danger').contains('Retirer').click();
        }).then(() => {
          cy.get('.confirm-modal .btn-danger').contains('Retirer').click();
          cy.get('.confirm-overlay').should('not.exist');
          cy.wait(500); // Attendre la mise à jour du DOM
        });
      }

      // Récupérer le nombre de PDFs
      cy.window().then((win) => {
        return win.electronAPI.getRecentPdfs();
      }).then((result) => {
        const pdfCount = result.recentPdfs.length;
        
        if (pdfCount === 0) {
          cy.log('⚠️ Aucun PDF à supprimer, test skippé');
          return;
        }

        // Supprimer tous les PDFs
        function removeAll(remaining) {
          if (remaining <= 0) return;
          
          removeFirstPdf().then(() => {
            cy.window().then((win) => {
              return win.electronAPI.getRecentPdfs();
            }).then((result) => {
              if (result.recentPdfs.length > 0) {
                removeAll(result.recentPdfs.length);
              }
            });
          });
        }

        removeAll(pdfCount);
      });

      // Vérifier l'état vide
      cy.get('.empty-state', { timeout: 5000 }).should('be.visible');
      cy.get('.empty-state-icon').should('contain', '📄');
      cy.get('.empty-state p').first().should('contain', 'Aucun PDF récent');
      cy.get('.empty-state p').last().should('contain', 'Ouvrez un PDF pour commencer');

      // Vérifier via IPC
      cy.window().then((win) => {
        return win.electronAPI.getRecentPdfs();
      }).then((result) => {
        expect(result.success).to.be.true;
        expect(result.recentPdfs).to.be.an('array');
        expect(result.recentPdfs.length).to.equal(0);
        cy.log('✅ État vide confirmé');
      });

      // Vérifier que le bouton "Ouvrir un PDF" est toujours accessible
      cy.get('.open-pdf-btn').should('be.visible').and('contain', 'Ouvrir un PDF');
    });
  });
});
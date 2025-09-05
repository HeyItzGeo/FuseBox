class VanillaEntityManager {
    constructor() {
        this.currentEntity = null;
        this.entities = [];
        this.materials = [];
        this.links = [];
        this.pendingEntity = null;
        this.exportManager = null;
        this.setExportManager();
        this.container = document.getElementById('entity-form-container');
        if (!this.container) {
            console.error('Container element with ID "entity-form-container" not found');
            return;
        }
        this.initEventListeners();
        this.renderEntities();
        this.renderMaterials();
        document.addEventListener('change', (e) => {
            const target = e.target;
            if (target.matches('[data-property$=".Enabled"]')) {
                this.toggleInputsForCheckbox(target);
            }
        });
        setTimeout(() => {
            document.querySelectorAll('[data-property$=".Enabled"]').forEach(checkbox => {
                this.toggleInputsForCheckbox(checkbox);
            });
        }, 0);
    }
    initEventListeners() {
        const addButton = document.getElementById('add-vanilla-entity');
        if (addButton) {
            addButton.addEventListener('click', () => {
                this.showEntityForm();
            });
        } else {
            console.warn('Add entity button not found');
        }
        document.addEventListener('input', (e) => {
        });
        document.addEventListener('click', (e) => {
            if (e.target.closest('.convert-to-group')) {
                return;
            }
            const editEntityBtn = e.target.closest('.edit-entity');
            if (editEntityBtn) {
                const entityId = editEntityBtn.dataset.id;
                this.showEntityForm(entityId);
                return;
            }
            const sidebar = document.getElementById('sidebar');
            const sidebarToggle = document.getElementById('sidebarToggle');
            document.addEventListener('click', (e) => {
                if (window.innerWidth < 992) {
                    const isClickInside = sidebar && (sidebar.contains(e.target) || (sidebarToggle && sidebarToggle.contains(e.target)));
                    if (!isClickInside && sidebar && !sidebar.classList.contains('show')) {
                        sidebar.classList.remove('show');
                    }
                }
            });
            const navLinks = document.querySelectorAll('#config-nav .nav-link');
            navLinks.forEach(link => {
                link.addEventListener('click', () => {
                    if (window.innerWidth < 992 && sidebar) {
                        sidebar.classList.remove('show');
                    }
                });
            });
            const deleteEntityBtn = e.target.closest('.delete-entity');
            if (deleteEntityBtn) {
                e.preventDefault();
                e.stopPropagation();
                const entityId = deleteEntityBtn.dataset.id;
                if (e.shiftKey) {
                    const linkedMaterials = this.getLinkedMaterials(entityId);
                    linkedMaterials.forEach(material => {
                        this.materials = this.materials.filter(m => m.id !== material.id);
                    });
                    this.entities = this.entities.filter(e => e.id !== entityId);
                    this.links = this.links.filter(link => link.entityId !== entityId);
                    this.saveState();
                    this.renderAll();
                } else {
                    this.deleteEntity(entityId);
                }
                return;
            }
            const editMaterialBtn = e.target.closest('.edit-material');
            if (editMaterialBtn) {
                const materialId = editMaterialBtn.dataset.id;
                window.EntityMaterialUI.showMaterialForm(this, materialId);
                return;
            }
            const deleteMaterialBtn = e.target.closest('.delete-material');
            if (deleteMaterialBtn) {
                e.preventDefault();
                e.stopPropagation();
                const materialId = deleteMaterialBtn.dataset.id;
                if (e.shiftKey) {
                    const linkedEntities = this.getLinkedEntities(materialId);
                    linkedEntities.forEach(entity => {
                        this.entities = this.entities.filter(e => e.id !== entity.id);
                    });
                    this.materials = this.materials.filter(m => m.id !== materialId);
                    this.links = this.links.filter(link => link.materialId !== materialId);
                    this.saveState();
                    this.renderAll();
                } else {
                    this.deleteMaterial(materialId);
                }
                return;
            }
        });
    }
    setExportManager() {
        if (window.exportManager) {
            this.exportManager = window.exportManager;
        } else {
            setTimeout(() => this.setExportManager(), 100);
        }
    }
    saveState() {
        if (this.exportManager && typeof this.exportManager.saveToStorage === 'function') {
            this.exportManager.saveToStorage();
        } else if (window.exportManager) {
            this.setExportManager();
            if (this.exportManager) {
                this.exportManager.saveToStorage();
            }
        }
    }
    showEntityForm(entityId) {
        window.EntityMaterialUI.showEntityForm(this, entityId);
    }
    capitalizeName(name) {
        if (!name) return '';
        return name.replace(/\b\w/g, (char) => char.toUpperCase());
    };
    async handleEntityFormSubmit(e, entityId) {
        e.preventDefault();
        const form = e.target.closest('form');
        const nameInput = form.querySelector('#entity-name');
        const name = this.capitalizeName(nameInput.value.trim());
        if (!name) {
            console.warn('Entity name is required');
            nameInput.focus();
            return;
        }
        const excludeIds = [];
        if (entityId) excludeIds.push(entityId);
        if (this.pendingMaterial && this.pendingMaterial.id) excludeIds.push(this.pendingMaterial.id);
        const shouldProceed = await window.EntityMaterialUI.showNameValidationModal(
            this,
            name,
            'entity',
            excludeIds.length > 0 ? excludeIds : null
        );
        if (!shouldProceed) {
            nameInput.focus();
            nameInput.select();
            return;
        }
        const properties = {};
        const inputs = form.querySelectorAll('input[data-property], select[data-property], textarea[data-property]');
        inputs.forEach(input => {
            const propName = input.dataset.property;
            if (!propName) return;
            if (input.type === 'checkbox') {
                properties[propName] = input.checked;
            } else if (input.type === 'number' || input.type === 'range') {
                properties[propName] = parseFloat(input.value) || 0;
            } else if (input.tagName === 'SELECT') {
                properties[propName] = input.value;
            } else {
                const rawValue = input.value;
                properties[propName] = (typeof rawValue === 'string') ? rawValue.trim() : String(rawValue ?? '');
            }
        });
        if (entityId) {
            const entityIndex = this.entities.findIndex(e => e.id === entityId);
            if (entityIndex !== -1) {
                this.entities[entityIndex] = {
                    ...this.entities[entityIndex],
                    name,
                    properties
                };
                this.currentEntity = this.entities[entityIndex];
            }
            window.EntityMaterialUI.showNotification(
                `Updated entity:<br><strong>${name}</strong>`,
                'success'
            );
            this.closeModal(form);
            this.renderAll();
            this.saveState();
        } else {
            const newEntity = {
                id: Date.now().toString(),
                name,
                properties
            };
            this.pendingEntity = newEntity;
            this.entities.push(newEntity);
            this.saveState();
            window.EntityMaterialUI.showNotification(
                `Added new entity:<br><strong>${name}</strong>`,
                'success'
            );
            this.closeModal(form);
            window.EntityMaterialUI.showMaterialForm(this);
        }
    }
    async handleMaterialFormSubmit(e, materialId) {
        e.preventDefault();
        const form = e.target.closest('form');
        const nameInput = form.querySelector('#material-name');
        const name = this.capitalizeName(nameInput.value.trim());
        if (!name) {
            console.warn('Material name is required');
            nameInput.focus();
            return;
        }
        const excludeIds = [];
        if (materialId) excludeIds.push(materialId);
        if (this.pendingEntity && this.pendingEntity.id) excludeIds.push(this.pendingEntity.id);
        const shouldProceed = await window.EntityMaterialUI.showNameValidationModal(
            this,
            name,
            'material',
            excludeIds.length > 0 ? excludeIds : null
        );
        if (!shouldProceed) {
            nameInput.focus();
            nameInput.select();
            return;
        }
        const properties = {};
        const inputs = form.querySelectorAll('[data-property]');
        inputs.forEach(input => {
            const propName = input.dataset.property;
            if (!propName) return;
            if (input.type === 'checkbox') {
                properties[propName] = input.checked;
            } else if (input.type === 'number' || input.type === 'range') {
                properties[propName] = parseFloat(input.value) || 0;
            } else if (input.tagName === 'SELECT') {
                properties[propName] = input.value;
            } else {
                properties[propName] = input.value.trim();
            }
        });
        if (materialId) {
            const materialIndex = this.materials.findIndex(m => m.id === materialId);
            if (materialIndex !== -1) {
                this.materials[materialIndex] = {
                    ...this.materials[materialIndex],
                    name,
                    properties,
                    updatedAt: new Date().toISOString()
                };
                this.saveState();
                window.EntityMaterialUI.showNotification(
                    `Updated material:<br><strong>${name}</strong>`,
                    'success'
                );
            }
        } else {
            const newMaterial = {
                id: Date.now().toString(),
                name,
                properties
            };
            this.materials.push(newMaterial);
            this.saveState();
            if (this.pendingEntity) {
                window.EntityMaterialUI.showNotification(
                    `Created new pair:<br>` +
                    `<div style="font-size: 0.85em; opacity: 0.8;">Entity:</div><strong>${this.pendingEntity.name}</strong><br>` +
                    `<div style="font-size: 0.85em; opacity: 0.8; margin-top: 4px;">Material:</div><strong>${name}</strong>`,
                    'success'
                );
            } else {
                window.EntityMaterialUI.showNotification(
                    `Added new material:<br><strong>${name}</strong>`,
                    'success'
                );
            }
            if (this.pendingEntity) {
                this.entities.push(this.pendingEntity);
                const link = {
                    entityId: this.pendingEntity.id,
                    materialId: newMaterial.id
                };
                this.links.push(link);
                this.saveState();
                this.pendingEntity = null;
            } else if (window.currentEntityId) {
                const link = {
                    entityId: window.currentEntityId,
                    materialId: newMaterial.id
                };
                this.links.push(link);
                this.saveState();
                window.currentEntityId = null;
            }
        }
        this.closeModal(form);
        this.renderAll();
        this.currentEntity = null;
    }
    closeModal(form) {
        const modal = form ? form.closest('.modal') : null;
        if (this.currentModal) {
            this.currentModal.hide();
            this.currentModal = null;
        } else if (modal) {
            const modalInstance = bootstrap.Modal.getInstance(modal);
            if (modalInstance) {
                modalInstance.hide();
            }
        }
    }
    renderEntities() {
        const container = document.getElementById('entity-container');
        if (!container) return;
        const entitiesWithMaterials = this.entities.map(entity => ({
            ...entity,
            linkedMaterials: this.getLinkedMaterials(entity.id)
        }));
        const pairings = [];
        entitiesWithMaterials.forEach(entity => {
            entity.linkedMaterials.forEach(material => {
                pairings.push(`${entity.name} + ${material.name}`);
            });
        });
        let emptyState = 'No entities added yet.';
        if (pairings.length > 0) {
            emptyState = `
                <div class="pairings-container">
                    <p>Current pairings:</p>
                    <div class="d-flex flex-wrap gap-2">
                        ${pairings.map(p => `<div class="pairing-badge">${p}</div>`).join('')}
                    </div>
                </div>
            `;
        }
        container.innerHTML = this.entities.length > 0
            ? `<div class="row row-cols-1 row-cols-md-2 g-3">
                  ${this.entities.map(entity => {
                      const entityWithMaterials = {
                          ...entity,
                          linkedMaterials: this.getLinkedMaterials(entity.id)
                      };
                      return `
                          <div class="col">
                              <div class="h-100">
                                  ${this.renderEntityCards([entityWithMaterials])}
                              </div>
                          </div>
                      `;
                  }).join('')}
              </div>`
            : emptyState;
    }
    renderEntityCards(entities) {
        return entities.map(entity => `
            <div class="card mb-2">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-0">${this.escapeHtml(this.capitalizeName(entity.name))}</h6>
                            ${entity.linkedMaterials.length > 0
                                ? `<small class="text-muted">Linked to: ${this.escapeHtml(
                                    entity.linkedMaterials.map(m => this.capitalizeName(m.name)).join(', ')
                                  )}</small>`
                                : '<small class="text-muted">No materials linked</small>'
                            }
                        </div>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-secondary convert-to-group"
                                    data-id="${entity.id}"
                                    data-type="entity"
                                    title="Convert to Group">
                                <i class="bi bi-collection me-1"></i> Group
                            </button>
                            <button class="btn btn-sm btn-outline-primary edit-entity"
                                    data-id="${entity.id}"
                                    title="Edit">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger delete-entity"
                                    data-id="${entity.id}"
                                    title="Delete">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }
    getLinkedMaterials(entityId) {
        return this.links
            .filter(link => link.entityId === entityId)
            .map(link => this.materials.find(m => m.id === link.materialId))
            .filter(Boolean);
    }
    getLinkedEntities(materialId) {
        return this.links
            .filter(link => link.materialId === materialId)
            .map(link => this.entities.find(e => e.id === link.entityId))
            .filter(Boolean);
    }
    renderMaterials() {
        const container = document.getElementById('materials-container');
        if (!container) return;
        const materialsWithEntities = this.materials.map(material => ({
            ...material,
            linkedEntities: this.getLinkedEntities(material.id)
        }));
        const emptyState = '<p class="text-muted">No materials added yet.</p>';
        container.innerHTML = materialsWithEntities.length > 0
            ? `<div class="row row-cols-1 row-cols-md-2 g-3">
                  ${materialsWithEntities.map(material => {
                      const materialWithEntities = {
                          ...material,
                          linkedEntities: this.getLinkedEntities(material.id)
                      };
                      return `
                          <div class="col">
                              <div class="h-100">
                                  ${this.renderMaterialCards([materialWithEntities])}
                              </div>
                          </div>
                      `;
                  }).join('')}
              </div>`
            : emptyState;
    }
    renderMaterialCards(materials) {
        return materials.map(material => `
            <div class="card mb-2">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-0">${this.escapeHtml(this.capitalizeName(material.name))}</h6>
                            ${material.linkedEntities.length > 0
                                ? `<small class="text-muted">Linked to: ${this.escapeHtml(
                                    material.linkedEntities.map(e => this.capitalizeName(e.name)).join(', ')
                                  )}</small>`
                                : '<small class="text-muted">No entities linked</small>'
                            }
                        </div>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-secondary convert-to-group"
                                    data-id="${material.id}"
                                    data-type="material"
                                    title="Convert to Group">
                                <i class="bi bi-collection me-1"></i> Group
                            </button>
                            <button class="btn btn-sm btn-outline-primary edit-material"
                                    data-id="${material.id}"
                                    title="Edit">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger delete-material"
                                    data-id="${material.id}"
                                    title="Delete">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }
    deleteEntity(id) {
        const linkedMaterials = this.getLinkedMaterials(id);
        const materialList = linkedMaterials.length
            ? `<ul>${linkedMaterials.map(m => `<li>${m.name}</li>`).join('')}</ul>`
            : '<p><em>No linked materials</em></p>';
        window.EntityMaterialUI.showConfirmModal(
            'Delete Entity',
            `<p>Are you sure you want to delete this entity? This will also delete the following linked materials:</p>
             ${materialList}
             <p class="text-danger fw-bold">This action cannot be undone.</p>`,
            () => {
                linkedMaterials.forEach(material => {
                    this.materials = this.materials.filter(m => m.id !== material.id);
                });
                this.entities = this.entities.filter(e => e.id !== id);
                this.links = this.links.filter(link => link.entityId !== id);
                this.saveState();
                this.renderAll();
            }
        );
    }
    deleteMaterial(id) {
        const linkedEntities = this.getLinkedEntities(id);
        const entityList = linkedEntities.length
            ? `<ul>${linkedEntities.map(e => `<li>${e.name}</li>`).join('')}</ul>`
            : '<p><em>No linked entities</em></p>';
        window.EntityMaterialUI.showConfirmModal(
            'Delete Material',
            `<p>Are you sure you want to delete this material? This will also delete the following linked entities:</p>
             ${entityList}
             <p class="text-danger fw-bold">This action cannot be undone.</p>`,
            () => {
                linkedEntities.forEach(entity => {
                    this.entities = this.entities.filter(e => e.id !== entity.id);
                });
                this.materials = this.materials.filter(m => m.id !== id);
                this.links = this.links.filter(link => link.materialId !== id);
                this.saveState();
                this.renderAll();
            }
        );
    }
editEntity(id) {
    const entity = this.entities.find(e => e.id === id);
    if (entity) {
        this.showEntityForm(id);
            this.showEntityForm(id);
        }
    }
    editMaterial(id) {
        const material = this.materials.find(m => m.id === id);
        if (material) {
            window.EntityMaterialUI.showMaterialForm(this, id);
        }
    }
    renderAll() {
        this.renderEntities();
        this.renderMaterials();
    }
    toggleInputsForCheckbox(checkbox) {
        if (!checkbox || !checkbox.dataset || !checkbox.dataset.property) return;
        const propertyPrefix = checkbox.dataset.property.split('.')[0];
        const form = checkbox.closest('form');
        if (!form) return;
        const inputs = form.querySelectorAll(`[data-property^="${propertyPrefix}."]`);
        if (propertyPrefix === 'Particles' || propertyPrefix === 'Sound') {
            const tabSuffix = propertyPrefix === 'Sound' ? 'sounds' : propertyPrefix.toLowerCase();
            const tabId = form.id === 'material-form' ? `material-${tabSuffix}-tab` : `${tabSuffix}-tab`;
            const tab = document.getElementById(tabId);
            if (tab) {
                if (checkbox.checked) {
                    tab.removeAttribute('data-disabled');
                } else {
                    tab.setAttribute('data-disabled', 'true');
                }
            }
        }
        inputs.forEach(input => {
            if (input === checkbox) return;
            input.disabled = true;
            input.classList.add('disabled-input');
        });
        if (checkbox.checked) {
            inputs.forEach(input => {
                if (input !== checkbox) {
                    input.disabled = false;
                    input.classList.remove('disabled-input');
                }
            });
        }
    }
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}
window.VanillaEntityManager = VanillaEntityManager;
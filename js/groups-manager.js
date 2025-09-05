class GroupsManager {
    constructor() {
        if (window.groupsManagerInstance) {
            return window.groupsManagerInstance;
        }
        this.entityGroups = [];
        this.materialGroups = [];
        this.isProcessing = false;
        this.boundHandleClick = null;
        this.initialized = false;
        this.conversionHistory = [];
        this.maxHistory = 5;
        window.groupsManagerInstance = this;
        this.loadGroups();
        setTimeout(() => {
            this.initEventListeners();
            this.renderGroups();
        }, 100);
    }
    loadGroups() {
        try {
            const savedGroups = localStorage.getItem('fuseboxGroups');
            if (savedGroups) {
                const { entityGroups = [], materialGroups = [] } = JSON.parse(savedGroups);
                this.entityGroups = entityGroups;
                this.materialGroups = materialGroups;
                return true;
            }
        } catch (error) {
            console.error('Error loading groups from localStorage:', error);
        }
        return false;
    }
    createGroupPair() {
        const timestamp = String(new Date().getTime()).slice(-4);
        const baseName = `Group_${timestamp}`;
        const timestampId = Date.now();
        const pairId = `pair-${timestampId}`;
        const defaultEntityProperties = window.EntityProperties?.getEntityProperties?.() || {};
        const defaultMaterialProperties = window.EntityProperties?.getMaterialProperties?.() || {};
        const entityProperties = {};
        if (defaultEntityProperties) {
            Object.entries(defaultEntityProperties).forEach(([key, config]) => {
                if (config.default !== undefined) {
                    entityProperties[key] = config.default;
                } else if (config.type === 'boolean') {
                    entityProperties[key] = false;
                } else if (config.type === 'number') {
                    entityProperties[key] = 0;
                } else {
                    entityProperties[key] = '';
                }
            });
        }
        const entityGroup = {
            id: `group-${timestampId}-entity`,
            name: `Entity_Group_${timestamp}`,
            type: 'entity',
            pairId: pairId,
            items: [],
            relatedGroups: [],
            properties: entityProperties
        };
        const materialProperties = {};
        if (defaultMaterialProperties) {
            Object.entries(defaultMaterialProperties).forEach(([key, config]) => {
                if (config.default !== undefined) {
                    materialProperties[key] = config.default;
                } else if (config.type === 'boolean') {
                    materialProperties[key] = false;
                } else if (config.type === 'number') {
                    materialProperties[key] = 0;
                } else {
                    materialProperties[key] = '';
                }
            });
        }
        const materialGroup = {
            id: `group-${timestampId}-material`,
            name: `Material_Group_${timestamp}`,
            type: 'material',
            pairId: pairId,
            items: [],
            relatedGroups: [],
            properties: materialProperties
        };
        entityGroup.relatedGroups.push(materialGroup.id);
        materialGroup.relatedGroups.push(entityGroup.id);
        this.entityGroups.push(entityGroup);
        this.materialGroups.push(materialGroup);
        this.saveGroups();
        this.renderGroups();
        const toast = new bootstrap.Toast(document.getElementById('toast'));
        const toastBody = document.querySelector('#toast .toast-body');
        if (toastBody) {
            toastBody.textContent = `Created new group pair: ${entityGroup.name} and ${materialGroup.name}`;
            toast.show();
        }
        return { entityGroup, materialGroup };
    }
    toggleInputsForCheckbox(checkbox) {
        if (!checkbox || !(checkbox instanceof HTMLElement)) return;
        if (!checkbox.dataset || !checkbox.dataset.property) {
            console.warn('Checkbox has no data-property attribute');
            return;
        }
        const baseProperty = checkbox.dataset.property.replace(/\.Enabled$/, '');
        const container = checkbox.closest('.tab-pane, .modal-content') || document;
        try {
            const escapedProperty = baseProperty.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const relatedInputs = container.querySelectorAll(
                `[data-property^="${escapedProperty}."]:not([data-property="${escapedProperty}.Enabled"])`
            );
            relatedInputs.forEach(input => {
                input.disabled = !checkbox.checked;
                if (input.classList.contains('form-group') || input.classList.contains('input-group')) {
                    const childInputs = input.querySelectorAll('input, select, button, textarea');
                    childInputs.forEach(child => {
                        child.disabled = !checkbox.checked;
                    });
                }
            });
        } catch (error) {
            console.error('Error toggling inputs for checkbox:', error);
        }
    }
    initEventListeners() {
        try {
            if (this.boundHandleClick) {
                document.removeEventListener('click', this.boundHandleClick, true);
            }
            this.boundHandleClick = (e) => {
                if (e.defaultPrevented) {
                    return;
                }
                this.handleClick(e);
            };
            document.addEventListener('click', this.boundHandleClick, true);
            document.addEventListener('change', (e) => {
                const target = e.target;
                if (target.matches('[data-property$=".Enabled"]')) {
                    this.toggleInputsForCheckbox(target);
                }
            });
        } catch (error) {
            console.error('Error initializing GroupsManager event listeners:', error);
        }
    }
    handleClick(e) {
        var convertBtn = e.target.closest('.convert-to-group');
        if (!convertBtn) {
            var addGroupPairBtn = e.target.closest('#add-group-pair');
            if (addGroupPairBtn) {
                this.createGroupPair();
                e.stopPropagation();
                e.preventDefault();
                return;
            }
            var addEntityGroupBtn = e.target.closest('#add-entity-group');
            if (addEntityGroupBtn) {
                window.EntityMaterialUI.showEntityForm(this, null, false, false);
                e.stopPropagation();
                e.preventDefault();
                return;
            }
            var addMaterialGroupBtn = e.target.closest('#add-material-group');
            if (addMaterialGroupBtn) {
                window.EntityMaterialUI.showMaterialForm(this, null, false, false);
                e.stopPropagation();
                e.preventDefault();
                return;
            }
            var editGroupBtn = e.target.closest('.edit-group');
            if (editGroupBtn) {
                var groupId = editGroupBtn.dataset.id;
                this.editGroup(groupId);
                e.stopPropagation();
                e.preventDefault();
                return;
            }
            var deleteGroupBtn = e.target.closest('.delete-group');
            if (deleteGroupBtn) {
                e.stopPropagation();
                e.preventDefault();
                var groupId = deleteGroupBtn.dataset.id;
                this.deleteGroup(groupId, false, e);
                return;
            }
            return;
        }
        this.isProcessing = true;
        const id = convertBtn.dataset.id;
        const type = convertBtn.dataset.type || 'entity';
        convertBtn.disabled = true;
        const self = this;
        setTimeout(() => {
            try {
                setTimeout(function() {
                    self.handleConvertToGroup(id, type)
                        .finally(() => {
                            convertBtn.disabled = false;
                            self.isProcessing = false;
                        })
                        .catch(error => {
                            console.error('Error in handleConvertToGroup:', error);
                        });
                }, 50);
            } catch (error) {
                console.error('Error in handleClick:', error);
                self.isProcessing = false;
                convertBtn.disabled = false;
            }
        }, 0);
    }
    _getRelatedItems(id, type) {
        const relatedItems = [];
        const { entities = [], materials = [], links = [] } = window.vanillaEntityManager || {};
        if (type === 'entity') {
            const materialIds = new Set(
                links
                    .filter(link => link?.entityId === id && link.materialId)
                    .map(link => link.materialId)
            );
            materials.forEach(material => {
                if (material && material.id && materialIds.has(material.id)) {
                    relatedItems.push({
                        ...material,
                        linkId: links.find(link => link.materialId === material.id)?.id
                    });
                }
            });
        } else {
            const entityIds = new Set(
                links
                    .filter(link => link?.materialId === id && link.entityId)
                    .map(link => link.entityId)
            );
            entities.forEach(entity => {
                if (entity && entity.id && entityIds.has(entity.id)) {
                    relatedItems.push({
                        ...entity,
                        linkId: links.find(link => link.entityId === entity.id)?.id
                    });
                }
            });
        }
        return relatedItems;
    }
    _showConvertToGroupModal(defaultEntityName, defaultMaterialName) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.classList.add('modal', 'fade');
            modal.innerHTML = `
                <div class="modal-dialog">
                    <div class="modal-content bg-dark text-light border border-secondary">
                        <div class="modal-header bg-dark border-secondary">
                            <h5 class="modal-title text-light">Convert to Group</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body bg-dark">
                            <div class="bg-secondary bg-opacity-25 p-3 mb-3 border border-secondary rounded">
                                <p class="mb-2 text-light">Creating a group lets you organize multiple entities, materials, or both under one name.</p>
                                <p class="mb-2 text-light">Groups can be used anywhere you'd normally use a single entity or material, and the plugin will automatically pick the right one.</p>
                                <p class="mb-0 text-light">This makes it easier to manage shared setups without duplicating configurations.</p>
                            </div>
                            <div class="mb-3">
                                <label for="entity-group-name" class="form-label">Entity Group Name</label>
                                <input type="text"
                                       class="form-control"
                                       id="entity-group-name"
                                       value="${this.escapeHtml(defaultEntityName)}">
                                <div class="form-text">Name for the entity group (e.g., '${this.escapeHtml(defaultEntityName)}_Group')</div>
                            </div>
                            <div class="mb-3">
                                <label for="material-group-name" class="form-label">Material Group Name</label>
                                <input type="text"
                                       class="form-control"
                                       id="material-group-name"
                                       value="${this.escapeHtml(defaultMaterialName)}">
                                <div class="form-text">Name for the material group (e.g., '${this.escapeHtml(defaultMaterialName)}_Materials')</div>
                            </div>
                            <div id="form-errors" class="alert alert-danger mt-3 d-none">
                                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                                <span id="error-message">Both group names are required</span>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                Cancel
                            </button>
                            <button type="button" class="btn btn-primary" id="save-group-names">
                                Create Groups
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            const bsModal = new bootstrap.Modal(modal, {
                backdrop: 'static',
                keyboard: false
            });
            const entityInput = modal.querySelector('#entity-group-name');
            const materialInput = modal.querySelector('#material-group-name');
            const saveButton = modal.querySelector('#save-group-names');
            const errorAlert = modal.querySelector('#form-errors');
            const errorMessage = modal.querySelector('#error-message');
            const handleSave = () => {
                const entityName = entityInput.value.trim();
                const materialName = materialInput.value.trim();
                if (!entityName || !materialName) {
                    errorMessage.textContent = 'Both group names are required';
                    errorAlert.classList.remove('d-none');
                    entityInput.focus();
                    return;
                }
                if (entityName === materialName) {
                    errorMessage.textContent = 'Entity and Material group names must be different';
                    errorAlert.classList.remove('d-none');
                    materialInput.focus();
                    return;
                }
                cleanup();
                resolve({ entityName, materialName });
            };
            const cleanup = () => {
                bsModal.hide();
                setTimeout(() => {
                    modal.remove();
                }, 300);
                saveButton.removeEventListener('click', handleSave);
                modal.removeEventListener('keydown', handleKeyDown);
                entityInput.removeEventListener('input', handleInput);
                materialInput.removeEventListener('input', handleInput);
            };
            const handleKeyDown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSave();
                } else if (e.key === 'Escape') {
                    bsModal.hide();
                }
            };
            const handleInput = () => {
                if (errorAlert && !errorAlert.classList.contains('d-none')) {
                    errorAlert.classList.add('d-none');
                }
            };
            saveButton.addEventListener('click', handleSave);
            modal.addEventListener('keydown', handleKeyDown);
            entityInput.addEventListener('input', handleInput);
            materialInput.addEventListener('input', handleInput);
            modal.addEventListener('hidden.bs.modal', () => {
                cleanup();
                resolve(null);
            });
            bsModal.show();
            setTimeout(() => {
                entityInput.select();
            }, 100);
        });
    }
    handleConvertToGroup(id, type) {
        return new Promise((resolve, reject) => {
            try {
                const propertyName = type === 'entity' ? 'entities' : 'materials';
                const manager = window.vanillaEntityManager;
                if (!manager?.[propertyName]) {
                    throw new Error(`Could not find ${propertyName} in vanillaEntityManager`);
                }
                const selectedItem = JSON.parse(JSON.stringify(manager[propertyName].find(item => item?.id === id)));
                if (!selectedItem) {
                    throw new Error(`${type} with ID ${id} not found`);
                }
                const relatedItems = this._getRelatedItems(id, type).map(item => ({
                    ...item,
                    originalType: type === 'entity' ? 'material' : 'entity'
                }));
                if (relatedItems.length === 0) {
                    throw new Error('No related items found to create a group with.');
                }
                const defaultEntityName = `${selectedItem.name}_Group`;
                const defaultMaterialName = relatedItems[0]?.name ? `${relatedItems[0].name}_Group` : 'Materials_Group';
                this._showConvertToGroupModal(defaultEntityName, defaultMaterialName)
                    .then(result => {
                        if (!result) {
                            resolve();
                            return;
                        }
                        const { entityName: entityGroupName, materialName: materialGroupName } = result;
                        const timestamp = Date.now();
                        const pairId = `pair-${timestamp}`;
                        const entityGroup = {
                            id: `group-${timestamp}-entity`,
                            name: entityGroupName,
                            type: 'entity',
                            pairId: pairId,
                            items: [selectedItem.name],
                            relatedGroups: [],
                            properties: { ...selectedItem.properties }
                        };
                        const materialGroup = {
                            id: `group-${timestamp}-material`,
                            name: materialGroupName,
                            type: 'material',
                            pairId: pairId,
                            items: relatedItems.map(item => item.name),
                            relatedGroups: [],
                            properties: {}
                        };
                        if (relatedItems.length > 0 && relatedItems[0].properties) {
                            materialGroup.properties = JSON.parse(JSON.stringify(relatedItems[0].properties));
                            if (relatedItems[0].properties.Sound) {
                                materialGroup.properties.Sound = { ...relatedItems[0].properties.Sound };
                            }
                        }
                        entityGroup.relatedGroups.push(materialGroup.id);
                        materialGroup.relatedGroups.push(entityGroup.id);
                        this.entityGroups.push(entityGroup);
                        this.materialGroups.push(materialGroup);
                        const links = [];
                        const manager = window.vanillaEntityManager;
                        if (type === 'entity') {
                            const link = manager.links?.find(l => l.entityId === selectedItem.id);
                            if (link) links.push({ ...link, type: 'link' });
                        } else {
                            const materialLinks = manager.links?.filter(l => l.materialId === selectedItem.id) || [];
                            materialLinks.forEach(link => {
                                links.push({ ...link, type: 'link' });
                            });
                        }
                        relatedItems.forEach(item => {
                            if (item.linkId) {
                                const link = manager.links?.find(l => l.id === item.linkId);
                                if (link) links.push({ ...link, type: 'link' });
                            }
                        });
                        const conversionData = {
                            entityGroup,
                            materialGroup,
                            originalItems: [
                                { ...selectedItem, type },
                                ...relatedItems.map(item => ({
                                    ...item,
                                    type: item.originalType || (type === 'entity' ? 'material' : 'entity')
                                })),
                                ...links
                            ],
                            timestamp: Date.now()
                        };
                        this.conversionHistory.push(conversionData);
                        if (this.conversionHistory.length > this.maxHistory) {
                            this.conversionHistory.shift();
                        }
                        this._cleanupOriginalItems(id, type, relatedItems);
                        this.saveGroups();
                        window.vanillaEntityManager.renderEntities();
                        window.vanillaEntityManager.renderMaterials();
                        this.renderGroups();
                        console.log('Conversion to groups completed');
                        this.showUndoNotification(conversionData);
                        resolve();
                    })
                    .catch(error => {
                        console.error('Error in group conversion:', error);
                        reject(error);
                    });
            } catch (error) {
                console.error('Error in handleConvertToGroup:', error);
                alert('An error occurred while converting to group. Please check the console for details.');
                reject(error);
            } finally {
                this.isProcessing = false;
                console.log('Conversion process completed');
            }
        });
    }
    showUndoNotification(conversionData) {
        const existingNotifications = document.querySelectorAll('.undo-notification');
        existingNotifications.forEach(el => el.remove());
        const notification = document.createElement('div');
        notification.className = 'undo-notification position-fixed bottom-0 end-0 m-3 p-3 bg-dark text-white rounded shadow-lg';
        notification.style.zIndex = '9999';
        notification.style.minWidth = '300px';
        notification.style.transition = 'opacity 0.5s, transform 0.3s ease';
        notification.style.transform = 'translateY(100px)';
        notification.style.opacity = '0';
        const progressBarEl = document.createElement('div');
        progressBarEl.className = 'progress-bar position-absolute top-0 start-0 h-1 bg-primary';
        progressBarEl.style.transition = 'width 1s linear';
        progressBarEl.style.width = '100%';
        progressBarEl.style.height = '2px';
        progressBarEl.style.borderTopLeftRadius = '4px';
        progressBarEl.style.borderTopRightRadius = '4px';
        notification.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div class="d-flex flex-column">
                    <span>Group created successfully</span>
                    <small class="text-muted">Auto-dismiss in <span id="countdown-timer">10</span>s</small>
                </div>
                <div class="d-flex align-items-center">
                    <button class="btn btn-sm btn-outline-light" id="undo-conversion" data-timestamp="${conversionData.timestamp}">
                        Undo
                    </button>
                    <button type="button" class="btn-close btn-close-white ms-2" aria-label="Close"></button>
                </div>
            </div>
        `;
        notification.prepend(progressBarEl);
        document.body.appendChild(notification);
        const undoBtn = notification.querySelector('#undo-conversion');
        const closeBtn = notification.querySelector('.btn-close');
        const removeNotification = () => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(100px)';
            setTimeout(() => notification.remove(), 500);
        };
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 100);
        undoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.undoConversion(conversionData.timestamp);
            removeNotification();
        });
        closeBtn.addEventListener('click', removeNotification);
        let timeLeft = 10;
        const countdownElement = notification.querySelector('#countdown-timer');
        const progressBar = notification.querySelector('.progress-bar');
        let countdownInterval;
        const startCountdown = () => {
            clearInterval(countdownInterval);
            timeLeft = 10;
            countdownElement.textContent = timeLeft;
            progressBar.style.width = '100%';
            countdownInterval = setInterval(() => {
                timeLeft--;
                countdownElement.textContent = timeLeft;
                progressBar.style.width = `${(timeLeft / 10) * 100}%`;
                if (timeLeft <= 0) {
                    clearInterval(countdownInterval);
                    removeNotification();
                }
            }, 1000);
        };
        let timeoutId = setTimeout(removeNotification, 10000);
        startCountdown();
        notification.addEventListener('mouseenter', () => {
            clearTimeout(timeoutId);
            clearInterval(countdownInterval);
            countdownElement.textContent = 'paused';
            progressBar.style.transition = 'none';
            progressBar.style.width = '100%';
        });
        notification.addEventListener('mouseleave', () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(removeNotification, 10000);
            startCountdown();
            progressBar.style.transition = 'width 1s linear';
        });
    }
    async undoConversion(timestamp) {
        const index = this.conversionHistory.findIndex(item => item.timestamp === timestamp);
        if (index === -1) {
            console.warn('Conversion not found in history');
            return;
        }
        const conversion = this.conversionHistory[index];
        const manager = window.vanillaEntityManager;
        try {
            this.entityGroups = this.entityGroups.filter(g => g.id !== conversion.entityGroup.id);
            this.materialGroups = this.materialGroups.filter(g => g.id !== conversion.materialGroup.id);
            if (conversion.originalItems && Array.isArray(conversion.originalItems)) {
                const itemsToRestore = [];
                const linksToRestore = [];
                conversion.originalItems.forEach(item => {
                    if (!item) return;
                    const { type, ...itemData } = item;
                    if (type === 'entity' || type === 'material') {
                        itemsToRestore.push({ type, data: itemData });
                    } else if (type === 'link') {
                        linksToRestore.push(itemData);
                    }
                });
                itemsToRestore.forEach(({ type, data }) => {
                    const collection = type === 'entity' ? 'entities' : 'materials';
                    if (!manager[collection]) {
                        console.warn(`Collection ${collection} not found in manager`);
                        return;
                    }
                    const existingIndex = manager[collection].findIndex(i => i.id === data.id);
                    if (existingIndex === -1) {
                        console.log(`Restoring ${type} with ID:`, data.id);
                        manager[collection].push(data);
                    } else {
                        console.log(`Updating existing ${type} with ID:`, data.id);
                        manager[collection][existingIndex] = { ...manager[collection][existingIndex], ...data };
                    }
                });
                if (!Array.isArray(manager.links)) {
                    console.warn('Links array not found in manager, initializing new links array');
                    manager.links = [];
                }
                const conversionLinks = conversion.originalItems
                    .filter(item => item.type === 'link')
                    .map(({ id, entityId, materialId }) => ({
                        id: id || `link-${Date.now()}`,
                        entityId,
                        materialId
                    }));
                conversionLinks.forEach(link => {
                    const exists = manager.links.some(l =>
                        l.entityId === link.entityId &&
                        l.materialId === link.materialId
                    );
                    if (!exists) {
                        manager.links.push({
                            id: link.id,
                            entityId: link.entityId,
                            materialId: link.materialId
                        });
                    }
                });
                manager.links = [...manager.links];
            }
            this.saveGroups();
            manager.renderEntities();
            manager.renderMaterials();
            this.renderGroups();
            this.conversionHistory.splice(index, 1);
            console.log('Undo successful');
        } catch (error) {
            console.error('Error undoing conversion:', error);
            alert('Error undoing group conversion. Check console for details.');
            throw error;
        }
    }
    _cleanupOriginalItems(id, type, relatedItems = []) {
        if (typeof id !== 'string' || !id.trim()) {
            throw new Error('Invalid item ID provided');
        }
        if (type !== 'entity' && type !== 'material') {
            throw new Error("Type must be either 'entity' or 'material'");
        }
        if (!Array.isArray(relatedItems)) {
            throw new Error('relatedItems must be an array');
        }
        const manager = window.vanillaEntityManager;
        if (!manager) {
            console.warn('vanillaEntityManager not found');
            return;
        }
        const typeConfig = {
            typeArray: type === 'entity' ? 'entities' : 'materials',
            relatedType: type === 'entity' ? 'material' : 'entity',
            typeId: type === 'entity' ? 'entityId' : 'materialId',
            relatedTypeId: type === 'entity' ? 'materialId' : 'entityId'
        };
        const { typeArray, relatedType, typeId, relatedTypeId } = typeConfig;
        if (Array.isArray(manager[typeArray])) {
            const initialLength = manager[typeArray].length;
            manager[typeArray] = manager[typeArray].filter(item => item?.id !== id);
            if (manager[typeArray].length === initialLength) {
                console.warn(`Item with ID ${id} not found in ${typeArray}`);
            }
        }
        if (relatedItems.length === 0) {
            return;
        }
        const relatedItemIds = new Set(relatedItems.map(item => item?.id).filter(Boolean));
        if (Array.isArray(manager[relatedType + 's'])) {
            const relatedTypeArray = relatedType + 's';
            const initialCount = manager[relatedTypeArray].length;
            manager[relatedTypeArray] = manager[relatedTypeArray].filter(
                item => !relatedItemIds.has(item?.id)
            );
            const removedCount = initialCount - manager[relatedTypeArray].length;
            if (removedCount < relatedItemIds.size) {
                console.warn(`Some related items were not found in ${relatedTypeArray}`);
            }
        }
        if (Array.isArray(manager.links)) {
            const initialLinkCount = manager.links.length;
            manager.links = manager.links.filter(link => {
                return !(
                    (link?.[typeId] === id && relatedItemIds.has(link?.[relatedTypeId])) ||
                    (link?.[relatedTypeId] === id && relatedItemIds.has(link?.[typeId]))
                );
            });
            if (manager.links.length === initialLinkCount) {
                console.warn('No links were removed during cleanup');
            }
        }
    }
    saveGroups() {
        try {
            const groupsData = {
                entityGroups: this.entityGroups,
                materialGroups: this.materialGroups,
                version: '1.0',
                lastUpdated: new Date().toISOString()
            };
            localStorage.setItem('fuseboxGroups', JSON.stringify(groupsData));
            console.log('Groups saved to localStorage');
            if (window.exportManager) {
                window.exportManager.saveToStorage();
            } else {
                console.warn('ExportManager not found - could not update saved state');
            }
            return true;
        } catch (error) {
            console.error('Error saving groups:', error);
            return false;
        }
    }
    renderGroups() {
        const container = document.getElementById('groups-container');
        if (!container) return;
        if (this.entityGroups.length === 0 && this.materialGroups.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info mb-0">
                    No groups found. Use the button above to create a new group pair.
                </div>
            `;
            return;
        }
        let html = `
            <div class="row g-3">
                <div class="col-md-6">
                    <h5 class="border-bottom pb-2 mb-3">Entity Groups</h5>
                    <div class="d-flex flex-column gap-3">
                        ${this.entityGroups.length > 0
                            ? this.entityGroups.map(group => this.renderGroupCard(group)).join('')
                            : '<div class="alert alert-secondary mb-0">No entity groups</div>'
                        }
                    </div>
                </div>
                <div class="col-md-6">
                    <h5 class="border-bottom pb-2 mb-3">Material Groups</h5>
                    <div class="d-flex flex-column gap-3">
                        ${this.materialGroups.length > 0
                            ? this.materialGroups.map(group => this.renderGroupCard(group)).join('')
                            : '<div class="alert alert-secondary mb-0">No material groups</div>'
                        }
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = html;
        container.querySelectorAll('.edit-group').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const groupId = e.currentTarget.dataset.id;
                this.editGroup(groupId);
            });
        });
        container.querySelectorAll('.delete-group').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const groupId = e.currentTarget.dataset.id;
                if (confirm('Are you sure you want to delete this group?')) {
                    this.deleteGroup(groupId);
                }
            });
        });
    }
    renderGroupCard(group) {
        const isEntityGroup = group.type === 'entity';
        const properties = [];
        const isRecent = this.conversionHistory.some(conv =>
            conv.entityGroup.id === group.id ||
            conv.materialGroup.id === group.id
        );
        if (isEntityGroup) {
            if (group.properties.ExplosionRadius !== undefined) {
                properties.push(['Explosion Radius', group.properties.ExplosionRadius]);
            }
            if (group.properties.ExplosionFactor !== undefined) {
                properties.push(['Explosion Factor', group.properties.ExplosionFactor]);
            }
            if (group.properties.UnderwaterExplosionFactor !== undefined) {
                properties.push(['Underwater Factor', group.properties.UnderwaterExplosionFactor]);
            }
        } else if (group.properties.Damage !== undefined) {
            properties.push(['Damage', group.properties.Damage]);
        }
        return `
            <div class="card mb-3 bg-dark text-light border-secondary">
                <div class="card-header d-flex justify-content-between align-items-center bg-dark border-secondary">
                    <h6 class="mb-0">
                        ${this.escapeHtml(group.name)} (${group.type} group)
                        ${isRecent ? '<span class="badge bg-info ms-2">New</span>' : ''}
                    </h6>
                    <div>
                        <button class="btn btn-sm btn-outline-warning edit-group me-1" data-id="${group.id}" title="Edit Group">
                            <i class="bi bi-pencil"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-group" data-id="${group.id}" title="Delete Group">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    ${properties.length > 0 ? `
                        <div class="properties">
                            ${properties.map(([key, value]) =>
                                `<div class="mb-1"><strong>${key}:</strong> ${value}</div>`
                            ).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>`;
    }
    editGroup(groupId) {
        let group = this.entityGroups.find(g => g.id === groupId);
        if (group) {
            const modal = window.EntityMaterialUI.getOrCreateModal('entity-group');
            const formContainer = modal.querySelector('#entity-group-form-container');
            formContainer.innerHTML = '';
            const form = window.EntityMaterialUI.createEntityForm('group-', false);
            formContainer.appendChild(form);
            const nameInput = form.querySelector('#entity-name');
            if (nameInput) {
                nameInput.value = group.name || '';
            }
            if (group.properties) {
                Object.entries(group.properties).forEach(([key, value]) => {
                    const input = form.querySelector(`[data-property="${key}"]`);
                    if (input) {
                        if (input.type === 'checkbox') {
                            input.checked = Boolean(value);
                        } else {
                            input.value = value;
                        }
                    }
                });
            }
            form.querySelectorAll('[data-property$=".Enabled"]').forEach(checkbox => {
                this.toggleInputsForCheckbox(checkbox);
            });
            const tabList = form.querySelector('#entityTabs');
            if (tabList) {
                const firstTab = tabList.querySelector('button[data-bs-toggle="tab"]');
                if (firstTab) {
                    const tab = new bootstrap.Tab(firstTab);
                    tab.show();
                }
            }
            form.onsubmit = (e) => {
                e.preventDefault();
                this.handleGroupFormSubmit(e, group.id);
                return false;
            };
            const modalInstance = new bootstrap.Modal(modal);
            modalInstance.show();
            if (group.items && group.items.length > 0) {
                const itemsList = modal.querySelector('#entity-group-items-list');
                itemsList.innerHTML = '';
                group.items.forEach(item => {
                    const itemElement = document.createElement('div');
                    itemElement.className = 'd-flex justify-content-between align-items-center mb-2';
                    itemElement.innerHTML = `
                        <span>${this.escapeHtml(item)}</span>
                        <button class="btn btn-sm btn-outline-danger delete-item" data-item="${this.escapeHtml(item)}">
                            <i class="bi bi-trash"></i>
                        </button>
                    `;
                    itemsList.appendChild(itemElement);
                });
            }
            const updateItemsList = () => {
                const itemsList = modal.querySelector('#entity-group-items-list');
                if (itemsList) {
                    itemsList.innerHTML = '';
                    (group.items || []).forEach(item => {
                        const itemElement = document.createElement('div');
                        itemElement.className = 'd-flex justify-content-between align-items-center mb-2';
                        itemElement.innerHTML = `
                            <span>${this.escapeHtml(item)}</span>
                            <button class="btn btn-sm btn-outline-danger delete-item" data-item="${this.escapeHtml(item)}">
                                <i class="bi bi-trash"></i>
                            </button>
                        `;
                        itemsList.appendChild(itemElement);
                    });
                }
            };
            const addButton = modal.querySelector('#entity-group-add-item');
            const itemInput = modal.querySelector('#entity-group-item-input');
            if (itemInput) {
                window.autocompleteUtils.setupEntityNameInput(itemInput);
                setTimeout(() => {
                    itemInput.focus();
                }, 100);
            }
            const addItem = (e) => {
                if (e) e.preventDefault();
                const item = itemInput.value.trim().toUpperCase();
                if (item) {
                    if (!group.items) group.items = [];
                    if (!group.items.includes(item)) {
                        group.items.push(item);
                        this.saveGroups();
                        updateItemsList();
                        itemInput.value = '';
                        itemInput.focus();
                    }
                }
                return false;
            };
            updateItemsList();
            if (addButton) addButton.onclick = addItem;
            if (itemInput) {
                itemInput.onkeydown = (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        addItem(e);
                    }
                };
            }
            modal.addEventListener('click', (e) => {
                if (e.target.closest('.delete-item')) {
                    e.preventDefault();
                    const button = e.target.closest('.delete-item');
                    const item = button.getAttribute('data-item');
                    group.items = group.items.filter(i => i !== item);
                    this.saveGroups();
                    updateItemsList();
                }
            });
            return;
        }
        group = this.materialGroups.find(g => g.id === groupId);
        if (group) {
            const modal = window.EntityMaterialUI.getOrCreateModal('material-group');
            const formContainer = modal.querySelector('#material-group-form-container');
            formContainer.innerHTML = '';
            const form = window.EntityMaterialUI.createMaterialForm('material-group-', false);
            formContainer.appendChild(form);
            const nameInput = form.querySelector('#material-name');
            if (nameInput) {
                nameInput.value = group.name || '';
            }
            if (group.properties) {
                Object.entries(group.properties).forEach(([key, value]) => {
                    const input = form.querySelector(`[data-property="${key}"]`);
                    if (input) {
                        if (input.type === 'checkbox') {
                            input.checked = Boolean(value);
                        } else {
                            input.value = value;
                        }
                    }
                });
            }
            form.querySelectorAll('[data-property$=".Enabled"]').forEach(checkbox => {
                this.toggleInputsForCheckbox(checkbox);
            });
            form.onsubmit = (e) => {
                e.preventDefault();
                this.handleGroupFormSubmit(e, group.id);
                return false;
            };
            const modalInstance = new bootstrap.Modal(modal);
            modalInstance.show();
            const updateItemsList = () => {
                const itemsList = modal.querySelector('#material-group-items-list');
                if (itemsList) {
                    itemsList.innerHTML = '';
                    (group.items || []).forEach(item => {
                        const itemElement = document.createElement('div');
                        itemElement.className = 'd-flex justify-content-between align-items-center mb-2';
                        itemElement.innerHTML = `
                            <span>${this.escapeHtml(item)}</span>
                            <button class="btn btn-sm btn-outline-danger delete-item" data-item="${this.escapeHtml(item)}">
                                <i class="bi bi-trash"></i>
                            </button>
                        `;
                        itemsList.appendChild(itemElement);
                    });
                }
            };
            updateItemsList();
            const addButton = modal.querySelector('#material-group-add-item');
            const itemInput = modal.querySelector('#material-group-item-input');
            if (itemInput) {
                window.autocompleteUtils.setupMaterialNameInput(itemInput);
                setTimeout(() => {
                    itemInput.focus();
                }, 100);
            }
            const addItem = (e) => {
                if (e) e.preventDefault();
                const item = itemInput.value.trim().toUpperCase();
                if (item) {
                    if (!group.items) group.items = [];
                    if (!group.items.includes(item)) {
                        group.items.push(item);
                        this.saveGroups();
                        updateItemsList();
                        itemInput.value = '';
                        itemInput.focus();
                    }
                }
                return false;
            };
            updateItemsList();
            if (addButton) addButton.onclick = addItem;
            if (itemInput) {
                itemInput.onkeydown = (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        addItem(e);
                    }
                };
            }
            modal.addEventListener('click', (e) => {
                if (e.target.closest('.delete-item')) {
                    e.preventDefault();
                    const button = e.target.closest('.delete-item');
                    const item = button.getAttribute('data-item');
                    group.items = group.items.filter(i => i !== item);
                    this.saveGroups();
                    updateItemsList();
                }
            });
            return;
        }
        console.error('Group not found:', groupId);
    }
    handleGroupFormSubmit(e, groupId = null) {
        e.preventDefault();
        const form = e.target.closest('form');
        const isEntityGroup = form.id === 'entity-form' || form.id === 'entity-group-form';
        const nameInput = form.querySelector(isEntityGroup ? '#entity-name' : '#material-name');
        const groupName = nameInput ? nameInput.value.trim() : '';
        if (!groupName) {
            alert('Please enter a group name');
            return;
        }
        const groups = isEntityGroup ? this.entityGroups : this.materialGroups;
        if (groups.some(g => g.name.toLowerCase() === groupName.toLowerCase() && g.id !== groupId)) {
            alert('A group with this name already exists');
            return;
        }
        const properties = {};
        form.querySelectorAll('input, select').forEach(input => {
            const propName = input.dataset.property;
            if (!propName) return;
            if (input.type === 'checkbox') {
                properties[propName] = input.checked;
            } else if (input.type === 'range' || input.type === 'number') {
                const value = parseFloat(input.value);
                if (!isNaN(value)) {
                    properties[propName] = value;
                }
            } else if (input.type === 'select-one') {
                properties[propName] = input.value;
            } else {
                properties[propName] = input.value;
            }
        });
        const group = {
            id: groupId || `group_${Date.now()}`,
            name: groupName,
            type: isEntityGroup ? 'entity' : 'material',
            properties: properties,
            relatedGroups: []
        };
        const targetGroups = isEntityGroup ? this.entityGroups : this.materialGroups;
        if (groupId) {
            const index = targetGroups.findIndex(g => g.id === groupId);
            if (index !== -1) {
                const existingGroup = targetGroups[index];
                if (existingGroup.relatedGroups) {
                    group.relatedGroups = existingGroup.relatedGroups;
                }
                if (existingGroup.items) {
                    group.items = [...existingGroup.items];
                }
                if (existingGroup.pairId) {
                    group.pairId = existingGroup.pairId;
                }
                targetGroups[index] = group;
            }
            this.saveGroups();
            window.EntityMaterialUI.showNotification(
                `Updated ${isEntityGroup ? 'entity' : 'material'} group:<br><strong>${groupName}</strong>`,
                'success'
            );
            const editModal = bootstrap.Modal.getInstance(form.closest('.modal'));
            if (editModal) {
                editModal.hide();
            }
            this.renderGroups();
        } else {
            group.items = [];
            targetGroups.push(group);
            this.saveGroups();
            window.EntityMaterialUI.showNotification(
                `Created new ${isEntityGroup ? 'entity' : 'material'} group:<br><strong>${groupName}</strong>`,
                'success'
            );
            const newModal = bootstrap.Modal.getInstance(form.closest('.modal'));
            if (newModal) {
                newModal.hide();
            }
            this.renderGroups();
        }
        this.renderGroups();
    }
    renderGroupCard(group) {
        const isEntityGroup = group.type === 'entity';
        const properties = [];
        if (isEntityGroup) {
            if (group.properties.ExplosionRadius !== undefined) {
                properties.push(['Explosion Radius', group.properties.ExplosionRadius]);
            }
            if (group.properties.ExplosionFactor !== undefined) {
                properties.push(['Explosion Factor', group.properties.ExplosionFactor]);
            }
            if (group.properties.UnderwaterExplosionFactor !== undefined) {
                properties.push(['Underwater Factor', group.properties.UnderwaterExplosionFactor]);
            }
        } else {
            if (group.properties.Damage !== undefined) {
                properties.push(['Damage', group.properties.Damage]);
            }
            if (group.properties.DropChance !== undefined) {
                properties.push(['Drop Chance', group.properties.DropChance + '%']);
            }
            if (group.properties.DropMaterial !== undefined) {
                properties.push(['Drop Material', group.properties.DropMaterial]);
            }
        }
        const items = group.items || [];
        return `
            <div class="card mb-3 h-100 group-card" data-group-id="${group.id}" style="display: flex; flex-direction: column;">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h6 class="mb-0">${this.escapeHtml(group.name)}</h6>
                    <span class="badge ${isEntityGroup ? 'bg-primary' : 'bg-success'}">
                        ${isEntityGroup ? 'Entity' : 'Material'}
                    </span>
                </div>
                <div class="card-body d-flex flex-column flex-grow-1 p-3">
                    ${properties.length > 0 ? `
                        <div class="mb-3">
                            <div class="small text-muted mb-2">Properties:</div>
                            <div class="row small g-2">
                                ${properties.map(([key, value]) => `
                                    <div class="col-6">
                                        <div class="d-flex justify-content-between text-truncate" title="${key}: ${value}">
                                            <span class="text-muted">${key}:</span>
                                            <span class="fw-medium">${value}</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : '<div class="mb-3"><span class="text-muted small">No properties</span></div>'}
                    <div class="group-items" style="min-height: 160px; max-height: 160px; display: flex; flex-direction: column;">
                        <div class="small text-muted mb-2">Items (${items.length}):</div>
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.25rem; min-height: 0; overflow-y: ${items.length > 0 ? 'auto' : 'hidden'}; flex-grow: 1; grid-auto-rows: 1fr; align-content: start;" class="${items.length === 0 ? 'no-scrollbar' : ''}">
                            ${items.length > 0 ? items.slice(0, 16).map((item, index) => `
                                <div style="min-height: 1.5rem; display: flex; align-items: center;">
                                    <div class="text-truncate small" style="width: 100%;" title="${this.escapeHtml(item)}">
                                        • ${this.escapeHtml(item)}
                                    </div>
                                </div>
                            `).join('') :
                            `<div style="grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; height: 100%; min-height: 120px;">
                                <span class="text-muted small" style="opacity: 0.7;">No items in this group</span>
                            </div>`}
                            ${items.length > 0 ? Array(16 - Math.min(items.length, 16)).fill(0).map(() => `
                                <div style="min-height: 1.5rem; visibility: hidden;">
                                    <span>•</span>
                                </div>
                            `).join('') : ''}
                        </div>
                        <div class="small text-muted" style="height: 1.25rem; line-height: 1.25rem; flex-shrink: 0; margin-top: auto;">
                            ${items.length > 16 ? `+${items.length - 16} more items` : '&nbsp;'}
                        </div>
                    </div>
                </div>
                <div class="card-footer bg-transparent p-2">
                    <div class="btn-group w-100">
                        <button class="btn btn-outline-primary btn-sm edit-group" data-id="${group.id}">
                            <i class="bi bi-pencil"></i> Edit
                        </button>
                        <button class="btn btn-outline-danger btn-sm delete-group" data-id="${group.id}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>`;
    }
    _getPairedGroup(groupId) {
        const entityGroup = this.entityGroups.find(g => g.id === groupId);
        if (entityGroup && entityGroup.pairId) {
            return this.materialGroups.find(g => g.pairId === entityGroup.pairId) || null;
        }
        const materialGroup = this.materialGroups.find(g => g.id === groupId);
        if (materialGroup && materialGroup.pairId) {
            return this.entityGroups.find(g => g.pairId === materialGroup.pairId) || null;
        }
        return null;
    }
    deleteGroup(groupId, skipConfirm = false) {
        const group = this.entityGroups.find(g => g.id === groupId) || this.materialGroups.find(g => g.id === groupId);
        if (!group) {
            console.error('Group not found for deletion:', groupId);
            return;
        }
        const pairedGroup = this._getPairedGroup(groupId);
        const event = window.event || {};
        if (skipConfirm || event.shiftKey) {
            this._deleteGroupAndPairedGroup(groupId, group, pairedGroup);
            return;
        }
        const groupType = group.type === 'entity' ? 'Entity' : 'Material';
        const pairedType = group.type === 'entity' ? 'Material' : 'Entity';
        const message = pairedGroup
            ? `<p>Are you sure you want to delete this ${groupType.toLowerCase()} group? This will also delete the linked ${pairedType.toLowerCase()} group:</p>
               <ul><li>${this.escapeHtml(pairedGroup.name)} (${pairedType})</li></ul>
               <p class="text-danger fw-bold">This action cannot be undone.</p>`
            : `<p>Are you sure you want to delete this ${groupType.toLowerCase()} group?</p>
               <p class="text-danger fw-bold">This action cannot be undone.</p>`;
        window.EntityMaterialUI.showConfirmModal(
            `Delete ${groupType} Group`,
            message,
            () => this._deleteGroupAndPairedGroup(groupId, group, pairedGroup)
        );
    }
    _deleteGroupAndPairedGroup(groupId, group, pairedGroup) {
        if (pairedGroup) {
            if (pairedGroup.type === 'entity') {
                const index = this.entityGroups.findIndex(g => g.id === pairedGroup.id);
                if (index !== -1) this.entityGroups.splice(index, 1);
            } else {
                const index = this.materialGroups.findIndex(g => g.id === pairedGroup.id);
                if (index !== -1) this.materialGroups.splice(index, 1);
            }
        }
        if (group.type === 'entity') {
            const index = this.entityGroups.findIndex(g => g.id === groupId);
            if (index !== -1) this.entityGroups.splice(index, 1);
        } else {
            const index = this.materialGroups.findIndex(g => g.id === groupId);
            if (index !== -1) this.materialGroups.splice(index, 1);
        }
        this.saveGroups();
        this.renderGroups();
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
window.GroupsManager = GroupsManager;
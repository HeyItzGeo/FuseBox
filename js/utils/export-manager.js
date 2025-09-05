class ExportManager {
    constructor(vanillaEntityManager) {
        this.vanillaEntityManager = vanillaEntityManager;
        this.STORAGE_KEY = 'fusebox_config';
        this.initClearConfigButton();
        this.loadFromStorage();
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initClipboard());
        } else {
            this.initClipboard();
        }
    }
    saveToStorage() {
        try {
            const groupsManager = window.groupsManagerInstance;
            const groupsData = groupsManager ? {
                entityGroups: groupsManager.entityGroups,
                materialGroups: groupsManager.materialGroups
            } : {};
            const uiSettings = this.collectUISettings();
            const data = {
                entities: this.vanillaEntityManager.entities,
                materials: this.vanillaEntityManager.materials,
                links: this.vanillaEntityManager.links,
                ...groupsData,
                ...uiSettings,
                version: '1.2',
                lastUpdated: new Date().toISOString()
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            if (groupsManager) {
                localStorage.setItem('fuseboxGroups', JSON.stringify(groupsData));
            }
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }
    collectUISettings() {
        const settings = {
            generalSettings: {},
            checktoolSettings: {}
        };
        document.querySelectorAll('.general-setting').forEach(input => {
            const key = input.dataset.path;
            if (key) {
                if (input.type === 'checkbox') {
                    settings.generalSettings[key] = input.checked;
                } else if (input.type === 'number') {
                    settings.generalSettings[key] = parseFloat(input.value) || 0;
                } else {
                    settings.generalSettings[key] = input.value;
                }
            }
        });
        document.querySelectorAll('.checktool-setting').forEach(input => {
            const key = input.dataset.path;
            if (key) {
                if (input.type === 'checkbox') {
                    settings.checktoolSettings[key] = input.checked;
                } else if (input.type === 'number') {
                    settings.checktoolSettings[key] = parseFloat(input.value) || 0;
                } else if (input.tagName === 'SELECT') {
                    settings.checktoolSettings[key] = input.value;
                } else {
                    settings.checktoolSettings[key] = input.value;
                }
            }
        });
        return settings;
    }
    applyUISettings(settings) {
        if (!settings) return;
        if (settings.generalSettings) {
            Object.entries(settings.generalSettings).forEach(([key, value]) => {
                const input = document.querySelector(`.general-setting[data-path="${key}"]`);
                if (input) {
                    if (input.type === 'checkbox') {
                        input.checked = Boolean(value);
                    } else {
                        input.value = value;
                    }
                    input.dispatchEvent(new Event('change'));
                }
            });
        }
        if (settings.checktoolSettings) {
            Object.entries(settings.checktoolSettings).forEach(([key, value]) => {
                const input = document.querySelector(`.checktool-setting[data-path="${key}"]`);
                if (input) {
                    if (input.type === 'checkbox') {
                        input.checked = Boolean(value);
                    } else if (input.tagName === 'SELECT') {
                        const option = input.querySelector(`option[value="${value}"]`);
                        if (option) {
                            input.value = value;
                        }
                    } else {
                        input.value = value;
                    }
                    input.dispatchEvent(new Event('change'));
                }
            });
        }
    }
    loadFromStorage() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            if (data) {
                const parsedData = JSON.parse(data);
                const {
                    entities,
                    materials,
                    links,
                    entityGroups,
                    materialGroups,
                    version,
                    generalSettings,
                    checktoolSettings
                } = parsedData;
                if (entities) this.vanillaEntityManager.entities = entities;
                if (materials) this.vanillaEntityManager.materials = materials;
                if (links) this.vanillaEntityManager.links = links;
                const groupsManager = window.groupsManagerInstance;
                if (groupsManager) {
                    if (entityGroups && materialGroups) {
                        groupsManager.entityGroups = entityGroups;
                        groupsManager.materialGroups = materialGroups;
                    }
                    else {
                        groupsManager.loadGroups();
                    }
                }
                if (version >= '1.2') {
                    this.applyUISettings({
                        generalSettings,
                        checktoolSettings
                    });
                }
                this.vanillaEntityManager.renderAll();
                if (groupsManager) {
                    groupsManager.renderGroups();
                }
            } else {
                const groupsManager = window.groupsManagerInstance;
                if (groupsManager) {
                    groupsManager.loadGroups();
                    groupsManager.renderGroups();
                }
            }
        } catch (error) {
            console.error('Error loading from localStorage:', error);
        }
    }
    async getYamlContent() {
        await this.saveToStorage();
        const configData = await this.prepareExportData();
        return this.formatAsYaml(configData);
    }
    async exportConfig() {
        try {
            const yamlContent = await this.getYamlContent();
            const blob = new Blob([yamlContent], { type: 'text/yaml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'fuzebox_rename_config.yaml';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 100);
        } catch (error) {
            console.error('Error exporting configuration:', error);
            this.showToast('Error exporting configuration: ' + error.message, 'danger');
        }
    }
    initClipboard() {
        const copyButton = document.getElementById('copy-yaml');
        if (!copyButton) return;
        copyButton.addEventListener('click', async () => {
            try {
                const yamlContent = document.getElementById('yaml-content')?.textContent;
                if (!yamlContent) {
                    throw new Error('No YAML content to copy');
                }
                await navigator.clipboard.writeText(yamlContent);
                if (window.EntityMaterialUI?.showNotification) {
                    window.EntityMaterialUI.showNotification('YAML copied to clipboard!', 'success');
                } else {
                    this.showToast('YAML copied to clipboard!', 'success');
                }
                const originalHtml = copyButton.innerHTML;
                copyButton.innerHTML = '<i class="bi bi-check2 me-1"></i> Copied!';
                copyButton.classList.remove('btn-primary');
                copyButton.classList.add('btn-success');
                setTimeout(() => {
                    copyButton.innerHTML = originalHtml;
                    copyButton.classList.remove('btn-success');
                    copyButton.classList.add('btn-primary');
                }, 2000);
            } catch (err) {
                console.error('Failed to copy text: ', err);
                if (window.EntityMaterialUI?.showNotification) {
                    window.EntityMaterialUI.showNotification('Failed to copy to clipboard', 'error');
                } else {
                    this.showToast('Failed to copy to clipboard', 'danger');
                }
            }
        });
    }
    groupProperties(properties) {
        const result = {};
        const groups = {};
        Object.entries(properties).forEach(([key, value]) => {
            const dotIndex = key.indexOf('.');
            if (dotIndex > 0) {
                const groupName = key.substring(0, dotIndex);
                const propName = key.substring(dotIndex + 1);
                if (!groups[groupName]) {
                    groups[groupName] = {};
                }
                groups[groupName][propName] = value;
            } else {
                result[key] = value;
            }
        });
        Object.entries(groups).forEach(([groupName, groupProps]) => {
            if (groupName === 'Particles') {
                if (groupProps.Enabled !== false) {
                    const { Enabled, Name, ...filteredProps } = groupProps;
                    const particleType = Name || '';
                    const isDust = particleType === 'DUST';
                    const isBlockType = [
                        'BLOCK', 'BLOCK_CRACK', 'BLOCK_DUST',
                        'BLOCK_MARKER', 'DUST_PILLAR', 'FALLING_DUST'
                    ].includes(particleType);
                    const filteredParticleProps = Object.entries(filteredProps).reduce((acc, [k, v]) => {
                        if (isDust && k === 'Material') return acc;
                        if (!isBlockType && k === 'Material') return acc;
                        if (!isDust && ['Red', 'Green', 'Blue', 'Size'].includes(k)) return acc;
                        if (typeof v === 'string' && !isNaN(v) && v.trim() !== '') {
                            const num = parseFloat(v);
                            acc[k] = num.toString() === v ? num : v;
                        } else {
                            acc[k] = v;
                        }
                        return acc;
                    }, {});
                    if (Object.keys(filteredParticleProps).length > 0) {
                        result[groupName] = filteredParticleProps;
                        if (Name) {
                            result[groupName] = { Name, ...result[groupName] };
                        }
                    }
                }
            }
            else if (groupName === 'Sound') {
                if (groupProps.Enabled !== false) {
                    const { Enabled, ...filteredProps } = groupProps;
                    const props = Object.entries(filteredProps).reduce((acc, [k, v]) => {
                        if (typeof v === 'string' && !isNaN(v) && v.trim() !== '') {
                            const num = parseFloat(v);
                            acc[k] = num.toString() === v ? num : v;
                        } else {
                            acc[k] = v;
                        }
                        return acc;
                    }, {});
                    if (Object.keys(props).length > 0) {
                        result[groupName] = props;
                    }
                }
            } else {
                result[groupName] = groupProps;
            }
        });
        return result;
    }
    convertNumberTypes(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        const result = Array.isArray(obj) ? [] : {};
        for (const [key, value] of Object.entries(obj)) {
            if (value === null || value === undefined) {
                result[key] = value;
                continue;
            }
            if (typeof value === 'object') {
                result[key] = this.convertNumberTypes(value);
                continue;
            }
            if (typeof value === 'string' && !isNaN(value) && value.trim() !== '') {
                const num = parseFloat(value);
                if (num.toString() === value) {
                    result[key] = num;
                    continue;
                }
            }
            result[key] = value;
        }
        return result;
    }
    getGeneralSettings() {
        const settings = {};
        const generalSettings = ['UseBlockDatabase', 'CheckBlockDatabaseAtStartup', 'BlockDurability', 'EnableMetrics'];
        generalSettings.forEach(settingId => {
            const element = document.getElementById(settingId);
            if (!element) return;
            let value;
            if (element.type === 'checkbox') {
                value = element.checked;
            } else if (element.type === 'number') {
                value = parseFloat(element.value) || 0;
            } else {
                value = element.value;
                if (value.toLowerCase() === 'true') value = true;
                else if (value.toLowerCase() === 'false') value = false;
                else if (!isNaN(value) && value.trim() !== '') value = parseFloat(value);
            }
            settings[settingId] = value;
        });
        return settings;
    }
    async showClearConfigWarning() {
        return new Promise((resolve) => {
            const modalId = 'clear-config-warning';
            const existingModal = document.getElementById(modalId);
            if (existingModal) {
                existingModal.remove();
            }
            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            overlay.style.zIndex = '1079';
            overlay.style.pointerEvents = 'auto';
            const container = document.createElement('div');
            container.id = modalId + '-container';
            container.style.position = 'fixed';
            container.style.top = '0';
            container.style.left = '0';
            container.style.width = '100%';
            container.style.height = '100%';
            container.style.display = 'flex';
            container.style.justifyContent = 'center';
            container.style.alignItems = 'center';
            container.style.pointerEvents = 'none';
            container.style.zIndex = '1080';
            container.style.padding = '20px';
            container.style.boxSizing = 'border-box';
            const modal = document.createElement("div");
            modal.id = modalId;
            modal.className = "bg-dark text-light shadow-lg rounded-3 border border-danger";
            modal.style.width = '100%';
            modal.style.maxWidth = '500px';
            modal.style.pointerEvents = 'auto';
            modal.style.maxHeight = '80vh';
            modal.style.overflowY = 'auto';
            modal.style.transform = 'translateY(0)';
            modal.style.transition = 'transform 0.3s ease-out';
            const header = document.createElement("div");
            header.className = "d-flex justify-content-between align-items-center p-3 border-bottom border-danger";
            header.innerHTML = `
                <h5 class="modal-title text-danger m-0 d-flex align-items-center">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    Clear All Configurations
                </h5>
                <button type="button" class="btn-close btn-close-white" aria-label="Close"></button>
            `;
            const closeBtn = header.querySelector('button');
            const body = document.createElement("div");
            body.className = "p-3";
            body.innerHTML = `
                <p class="mb-2">⚠️ <strong>WARNING:</strong> This will clear ALL saved configurations.</p>
                <p class="mb-0">This action cannot be undone. Are you sure you want to continue?</p>
            `;
            const footer = document.createElement("div");
            footer.className = "d-flex justify-content-end gap-2 p-3 border-top border-danger";
            const cancelBtn = document.createElement("button");
            cancelBtn.type = "button";
            cancelBtn.className = "btn btn-sm btn-outline-secondary";
            cancelBtn.textContent = "Cancel";
            const confirmBtn = document.createElement("button");
            confirmBtn.type = "button";
            confirmBtn.className = "btn btn-sm btn-danger";
            confirmBtn.textContent = "Clear All";
            footer.append(cancelBtn, confirmBtn);
            modal.append(header, body, footer);
            container.appendChild(modal);
            document.body.appendChild(overlay);
            document.body.appendChild(container);
            setTimeout(() => {
                modal.style.transform = 'translateY(0)';
            }, 10);
            const cleanup = (result = false) => {
                modal.style.transform = 'translateY(100%)';
                overlay.style.opacity = '0';
                overlay.style.transition = 'opacity 0.3s ease-out';
                setTimeout(() => {
                    container.remove();
                    overlay.remove();
                    resolve(result);
                }, 300);
            };
            const handleConfirm = () => cleanup(true);
            const handleCancel = () => cleanup(false);
            confirmBtn.addEventListener("click", handleConfirm);
            cancelBtn.addEventListener("click", handleCancel);
            closeBtn.addEventListener("click", handleCancel);
            const handleKeyDown = (e) => {
                if (e.key === 'Escape') {
                    handleCancel();
                }
            };
            document.addEventListener('keydown', handleKeyDown);
            const removeEventListeners = () => {
                confirmBtn.removeEventListener("click", handleConfirm);
                cancelBtn.removeEventListener("click", handleCancel);
                closeBtn.removeEventListener("click", handleCancel);
                document.removeEventListener('keydown', handleKeyDown);
            };
            container.addEventListener('transitionend', function handler() {
                container.removeEventListener('transitionend', handler);
                if (!container.isConnected) {
                    removeEventListeners();
                }
            });
        });
    }
    initClearConfigButton() {
        const clearBtn = document.getElementById('clear-config-btn');
        if (!clearBtn) return;
        clearBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const shouldClear = await this.showClearConfigWarning();
            if (shouldClear) {
                try {
                    localStorage.clear();
                    sessionStorage.setItem('showSuccessMessage', 'All configurations have been cleared successfully');
                    const overlay = document.createElement('div');
                    overlay.id = 'reload-overlay';
                    overlay.style.position = 'fixed';
                    overlay.style.top = '0';
                    overlay.style.left = '0';
                    overlay.style.width = '100%';
                    overlay.style.height = '100%';
                    overlay.style.backgroundColor = '#000000';
                    overlay.style.zIndex = '9999';
                    overlay.style.pointerEvents = 'none';
                    document.body.appendChild(overlay);
                    overlay.offsetHeight;
                    setTimeout(() => {
                        window.location.reload();
                    }, 50);
                } catch (error) {
                    console.error('Error clearing config:', error);
                    this.showToast('Error clearing configurations: ' + error.message, 'danger');
                }
            }
        });
        const tooltip = new bootstrap.Tooltip(clearBtn);
    }
    getChecktoolSettings() {
        const settings = {};
        document.querySelectorAll('[data-path^="Checktool."]').forEach(element => {
            const path = element.getAttribute('data-path');
            const settingName = path.split('.')[1];
            let value;
            if (element.type === 'checkbox') {
                value = element.checked;
            } else if (element.type === 'number') {
                value = parseFloat(element.value);
                if (element.id === 'Checktool.BossBarDuration') {
                    value = element.value.toString().replace('ms', '').trim();
                    value = parseFloat(value) || 0;
                }
            } else {
                value = element.value;
                if (value.toLowerCase() === 'true') value = true;
                else if (value.toLowerCase() === 'false') value = false;
                else if (!isNaN(value) && value.trim() !== '') value = parseFloat(value);
            }
            settings[settingName] = value;
        });
        return settings;
    }
    getGroupsData() {
        const groupsManager = window.groupsManagerInstance;
        if (!groupsManager) {
            console.warn('GroupsManager not found');
            return { Groups: {} };
        }
        const result = {
            Groups: {}
        };
        const excludedProperties = [
            'CheckToolAlwaysEnabled',
            'CheckToolShowBossBar',
            'BossBarColor',
            'BossBarStyle',
            'BossBarDuration'
        ];
        const filterProperties = (properties) => {
            if (!properties) return {};
            const filtered = { ...properties };
            excludedProperties.forEach(prop => {
                delete filtered[prop];
            });
            Object.keys(filtered).forEach(key => {
                if (typeof filtered[key] === 'object' && filtered[key] !== null) {
                    filtered[key] = filterProperties(filtered[key]);
                }
            });
            return filtered;
        };
        const groupsById = new Map();
        groupsManager.entityGroups.forEach(group => {
            result.Groups[group.name] = group.items || [];
            result[group.name] = {
                Materials: {},
                Properties: {}
            };
            groupsById.set(group.id, {
                name: group.name,
                type: 'entity',
                group: group
            });
        });
        groupsManager.materialGroups.forEach(materialGroup => {
            if (!result.Groups[materialGroup.name]) {
                result.Groups[materialGroup.name] = materialGroup.items || [];
            }
        });
        groupsManager.entityGroups.forEach(group => {
            if (result[group.name]) {
                result[group.name].Properties = this.groupProperties(
                    filterProperties(group.properties || {})
                );
            }
        });
        groupsManager.materialGroups.forEach(materialGroup => {
            materialGroup.properties = materialGroup.properties || {};
            materialGroup.relatedGroups = materialGroup.relatedGroups || [];
            materialGroup.items = materialGroup.items || [];
            const relatedGroupsToProcess = materialGroup.relatedGroups.length > 0
                ? materialGroup.relatedGroups
                : Array.from(groupsById.keys());
            relatedGroupsToProcess.forEach(relatedId => {
                const relatedGroup = groupsById.get(relatedId);
                if (relatedGroup && result[relatedGroup.name]) {
                    const entityExport = result[relatedGroup.name];
                    entityExport.Materials[materialGroup.name] = this.groupProperties(
                        filterProperties(materialGroup.properties || {})
                    );
                    if (materialGroup.entityProperties) {
                        entityExport.Properties = {
                            ...entityExport.Properties,
                            ...this.groupProperties(filterProperties(materialGroup.entityProperties))
                        };
                    }
                }
            });
        });
        return result;
    }
    getVanillaEntityData() {
        const data = {};
        const materialsMap = {};
        this.vanillaEntityManager.materials.forEach(material => {
            materialsMap[material.id] = material;
        });
        this.vanillaEntityManager.entities.forEach(entity => {
            const entityEntry = {
                'Materials': {},
                'Properties': this.groupProperties(entity.properties || {})
            };
            const entityRelationships = (this.vanillaEntityManager.links || []).filter(
                link => link.entityId === entity.id
            );
            entityRelationships.forEach(rel => {
                const material = materialsMap[rel.materialId];
                if (material) {
                    entityEntry.Materials[material.name] = this.groupProperties(material.properties || {});
                }
            });
            data[entity.name] = entityEntry;
        });
        return data;
    }
    prepareExportData() {
        const generalSettings = this.getGeneralSettings();
        let localizationSettings = {};
        if (window.LocalizationSettings) {
            const localizationInstance = new window.LocalizationSettings({});
            localizationSettings = localizationInstance.getValues();
        }
        const checktoolSettings = this.getChecktoolSettings();
        const groupsData = this.getGroupsData();
        const vanillaEntityData = this.getVanillaEntityData();
        const exportData = {
            ...generalSettings,
            Checktool: checktoolSettings
        };
        if (groupsData.Groups && Object.keys(groupsData.Groups).length > 0) {
            exportData.Groups = groupsData.Groups;
        }
        exportData.VanillaEntity = vanillaEntityData;
        if (groupsData.Groups && Object.keys(groupsData.Groups).length > 0) {
            Object.entries(groupsData).forEach(([key, value]) => {
                if (key !== 'Groups' && value && typeof value === 'object') {
                    exportData.VanillaEntity[key] = value;
                }
            });
        }
        if (localizationSettings && Object.keys(localizationSettings).length > 0) {
            const reorderedExport = { ...exportData };
            reorderedExport.Locale = { ...localizationSettings.locale };
            if (localizationSettings.localePrefix) {
                reorderedExport.LocalePrefix = localizationSettings.localePrefix;
            }
            return this.convertNumberTypes(reorderedExport);
        }
        return this.convertNumberTypes(exportData);
    }
    shouldQuoteValue(value) {
        if (value === null || value === undefined) {
            return false;
        }
        if (typeof value === 'string') {
            if (!isNaN(value) && value.trim() !== '') {
                return true;
            }
            const lowerValue = value.toLowerCase();
            if (lowerValue === 'true' || lowerValue === 'false') {
                return true;
            }
            return /[:{}\[\],&*#?|>\-=!%@`"']/.test(value);
        }
        return false;
    }
    formatAsYaml(obj, indent = 0, parentKey = '') {
        if (obj === null || obj === undefined) {
            return '';
        }
        const indentStr = '  '.repeat(indent);
        let result = '';
        if (indent === 0) {
            const rootSettings = {};
            const sections = {};
            Object.entries(obj).forEach(([key, value]) => {
                if (['Checktool', 'VanillaEntity', 'Groups', 'Locale', 'LocalePrefix'].includes(key)) {
                    sections[key] = value;
                } else {
                    rootSettings[key] = value;
                }
            });
            Object.entries(rootSettings).forEach(([key, value], index, array) => {
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    const nested = this.formatAsYaml(value, indent + 1, key);
                    result += `${key}:\n${nested}`;
                } else {
                    const formattedValue = this.shouldQuoteValue(value) ? `"${value}"` : value;
                    result += `${key}: ${formattedValue}\n`;
                }
                if (index === array.length - 1 && Object.keys(sections).length > 0) {
                    result += '\n';
                }
            });
            const sectionOrder = ['Checktool', 'VanillaEntity', 'Groups', 'Locale', 'LocalePrefix'];
            sectionOrder.forEach((section, index) => {
                if (sections[section]) {
                    const sectionContent = this.formatAsYaml(sections[section], indent + 1);
                    result += `${section}:\n${sectionContent}`;
                    if (index < sectionOrder.length - 1 && this.hasNextSection(sections, sectionOrder, index)) {
                        result += '\n';
                    }
                }
            });
            if (indent === 0) {
                result = result.trim() + '\n\n' + ExportManager.SIGNATURE + '\n';
            }
            return result;
        }
        if (Array.isArray(obj)) {
            if (obj.length === 0) {
                return `${indentStr}[]\n`;
            }
            obj.forEach((item, index) => {
                if (typeof item === 'object' && item !== null) {
                    result += `${indentStr}-`;
                    const nested = this.formatAsYaml(item, indent + 2).trimStart();
                    if (nested) {
                        result += `\n${nested}`;
                    } else {
                        result += ' {}\n';
                    }
                } else {
                    const formattedValue = this.shouldQuoteValue(item) ? `"${item}"` : item;
                    result += `${indentStr}- ${formattedValue}`;
                }
                result += '\n';
            });
            return result;
        }
        if (typeof obj === 'object') {
            const entries = Object.entries(obj);
            if (entries.length === 0) {
                return `${indentStr}{}\n`;
            }
            const isMaterialsOrProperties = ['Materials', 'Properties'].includes(parentKey);
            entries.forEach(([key, value], index) => {
                if (value === undefined) {
                    return;
                }
                const isLast = index === entries.length - 1;
                const isEntity = indent === 1 && parentKey === 'VanillaEntity';
                const isGroup = indent === 2 && parentKey === 'VanillaEntity' && !['Materials', 'Properties'].includes(key);
                if (isEntity && index > 0) {
                    result += '\n';
                }
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    const nested = this.formatAsYaml(value, indent + 1, key);
                    if (nested.trim() === '') {
                        result += `${indentStr}${key}: {}\n`;
                    } else {
                        if (['VanillaEntity', 'Checktool', 'GroupsExported'].includes(key)) {
                            result += '\n';
                        }
                        result += `${indentStr}${key}:\n${nested}`;
                    }
                }
                else if (Array.isArray(value)) {
                    if (value.length === 0) {
                        result += `${indentStr}${key}: []\n`;
                    } else {
                        result += `${indentStr}${key}:\n`;
                        result += this.formatAsYaml(value, indent + 1, key);
                    }
                }
                else {
                    const formattedValue = this.shouldQuoteValue(value)
                        ? `"${value}"`
                        : (value === null ? 'null' : value);
                    result += `${indentStr}${key}: ${formattedValue}\n`;
                }
            });
            return result;
        }
        const formattedValue = this.shouldQuoteValue(obj) ? `"${obj}"` : obj;
        return `${indentStr}${formattedValue}\n`;
    }
    static get SIGNATURE() {
        return '# Created with FuseBox';
    }
    static hasValidSignature(content) {
        return content.trim().endsWith(ExportManager.SIGNATURE);
    }
    hasNextSection(sections, sectionOrder, currentIndex) {
        for (let i = currentIndex + 1; i < sectionOrder.length; i++) {
            if (sections[sectionOrder[i]]) {
                return true;
            }
        }
        return false;
    }
    showToast(message, type = 'info') {
        alert(`${type.toUpperCase()}: ${message}`);
    }
}
window.ExportManager = ExportManager;
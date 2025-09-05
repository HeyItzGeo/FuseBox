class ImportManager {
    constructor() {
        this.initImportButton();
    }
    initImportButton() {
        const importBtn = document.getElementById('import-btn');
        if (importBtn) {
            const newBtn = importBtn.cloneNode(true);
            importBtn.parentNode.replaceChild(newBtn, importBtn);
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleFileSelect();
            });
        }
    }
    handleFileSelect() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.yaml,.yml';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const content = event.target.result;
                    if (!window.ExportManager || !window.ExportManager.hasValidSignature) {
                        console.warn('ExportManager not available for signature validation');
                        const config = this.parseYaml(content);
                        this.processConfig(config);
                        return;
                    }
                    const hasSignature = window.ExportManager.hasValidSignature(content);
                    if (!hasSignature) {
                        const proceed = await this.showUnsignedConfigWarning();
                        if (!proceed) {
                            return;
                        }
                    }
                    const config = this.parseYaml(content);
                    this.processConfig(config);
                } catch (error) {
                    console.error('Error parsing YAML:', error);
                    this.showErrorMessage('Error parsing YAML file: ' + error.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }
    parseYaml(content) {
        return window.jsyaml.load(content);
    }
    processConfig(config) {
        const groupNames = new Set(Object.keys(config.Groups || {}));
        const result = {
            entities: [],
            materials: [],
            links: [],
            entityGroups: [],
            materialGroups: [],
            generalSettings: {
                UseBlockDatabase: config.UseBlockDatabase,
                CheckBlockDatabaseAtStartup: config.CheckBlockDatabaseAtStartup,
                BlockDurability: config.BlockDurability,
                EnableMetrics: config.EnableMetrics,
                'Checktool.AlwaysEnabled': config.Checktool?.AlwaysEnabled,
                'Checktool.EnabledByDefault': config.Checktool?.EnabledByDefault,
                'Checktool.PreventActionWhenCheckingHandledBlocks': config.Checktool?.PreventActionWhenCheckingHandledBlocks,
                'Checktool.PreventActionWhenCheckingNonHandledBlocks': config.Checktool?.PreventActionWhenCheckingNonHandledBlocks,
                'Checktool.SilentWhenCheckingOnDisabledWorlds': config.Checktool?.SilentWhenCheckingOnDisabledWorlds,
                'Checktool.SilentWhenCheckingWithoutPermissions': config.Checktool?.SilentWhenCheckingWithoutPermissions,
                'Checktool.SilentWhenCheckingNonHandledBlocks': config.Checktool?.SilentWhenCheckingNonHandledBlocks,
                'Checktool.SilentWhenCheckingHandledBlocks': config.Checktool?.SilentWhenCheckingHandledBlocks,
                'Checktool.ShowBossBar': config.Checktool?.ShowBossBar
            },
            checktoolSettings: {
                'Checktool.BossBarColor': config.Checktool?.BossBarColor,
                'Checktool.BossBarStyle': config.Checktool?.BossBarStyle,
                'Checktool.BossBarDuration': config.Checktool?.BossBarDuration
            },
            version: "1.2",
            lastUpdated: new Date().toISOString()
        };
        if (config.Locale) {
            var localizationData = {
                locale: {},
                localePrefix: config.LocalePrefix || (config.Locale?.LocalePrefix || "")
            };
            if (config.Locale) {
                Object.keys(config.Locale).forEach(function(key) {
                    if (key !== 'LocalePrefix') {
                        localizationData.locale[key] = config.Locale[key];
                    }
                });
            }
            localStorage.setItem('fuseBox_localization', JSON.stringify(localizationData));
        }
        const groupMap = new Map();
        const processedPairs = new Set();
        for (const [entityName, entityData] of Object.entries(config.VanillaEntity || {})) {
            if (!entityData.Materials) continue;
            const isEntityGroup = groupNames.has(entityName);
            for (const [materialName, materialData] of Object.entries(entityData.Materials)) {
                const isMaterialGroup = groupNames.has(materialName);
                if (isEntityGroup && isMaterialGroup) {
                    const pairId = `pair-${Date.now()}`;
                    const entityGroupId = `group-${Date.now()}-entity`;
                    const materialGroupId = `group-${Date.now()}-material`;
                    const pairKey = `${entityName}:${materialName}`;
                    if (processedPairs.has(pairKey)) continue;
                    processedPairs.add(pairKey);
                    const entityGroup = {
                        id: entityGroupId,
                        name: entityName,
                        type: 'entity',
                        pairId: pairId,
                        items: Array.isArray(config.Groups[entityName]) ?
                            config.Groups[entityName] :
                            [entityName],
                        relatedGroups: [materialGroupId],
                        properties: this.extractEntityProperties(entityData.Properties || {})
                    };
                    const materialGroup = {
                        id: materialGroupId,
                        name: materialName,
                        type: 'material',
                        pairId: pairId,
                        items: Array.isArray(config.Groups[materialName]) ?
                            config.Groups[materialName] :
                            [materialName],
                        relatedGroups: [entityGroupId],
                        properties: this.extractMaterialProperties(materialData)
                    };
                    result.entityGroups.push(entityGroup);
                    result.materialGroups.push(materialGroup);
                    groupMap.set(entityName, {
                        entityGroupId,
                        materialGroupId: null,
                        pairId
                    });
                    groupMap.set(materialName, {
                        entityGroupId: null,
                        materialGroupId,
                        pairId
                    });
                }
            }
        }
        const materialMap = new Map();
        for (const entityData of Object.values(config.VanillaEntity || {})) {
            if (!entityData.Materials) continue;
            for (const [materialName, materialData] of Object.entries(entityData.Materials)) {
                if (!groupNames.has(materialName) && !materialMap.has(materialName)) {
                    materialMap.set(materialName, {
                        id: `mat-${Date.now()}-${materialName}`,
                        name: materialName,
                        properties: this.extractMaterialProperties(materialData)
                    });
                }
            }
        }
        result.materials = Array.from(materialMap.values());
        for (const [entityName, entityData] of Object.entries(config.VanillaEntity || {})) {
            if (!entityData.Materials) continue;
            const isEntityGroup = groupNames.has(entityName);
            const entityId = `ent-${Date.now()}-${entityName}`;
            if (!isEntityGroup) {
                result.entities.push({
                    id: entityId,
                    name: entityName,
                    properties: this.extractEntityProperties(entityData.Properties || {})
                });
            }
            for (const [materialName, materialData] of Object.entries(entityData.Materials)) {
                const isMaterialGroup = groupNames.has(materialName);
                if (!isEntityGroup && !isMaterialGroup) {
                    const material = materialMap.get(materialName);
                    if (material) {
                        result.links.push({
                            entityId: entityId,
                            materialId: material.id,
                            entityGroup: null,
                            materialGroup: null
                        });
                    }
                }
            }
        }
        try {
            const { entityGroups, materialGroups, localization, ...configWithoutGroups } = result;
            localStorage.setItem('fusebox_config', JSON.stringify(configWithoutGroups));
            const groupsData = {
                entityGroups: result.entityGroups.map(group => ({
                    ...group,
                    properties: this.cleanProperties(group.properties)
                })),
                materialGroups: result.materialGroups.map(group => ({
                    ...group,
                    properties: this.cleanProperties(group.properties)
                }))
            };
            localStorage.setItem('fuseboxGroups', JSON.stringify(groupsData));
            if (result.localization) {
                localStorage.setItem('fuseBox_localization', JSON.stringify(result.localization));
            }
            localStorage.setItem('vanillaEntities', JSON.stringify(result.entities || []));
            localStorage.setItem('vanillaMaterials', JSON.stringify(result.materials || []));
            localStorage.setItem('vanillaEntityLinks', JSON.stringify(result.links || []));
            const updatedSections = [];
            const summary = [];
            const entityGroupCount = (result.entityGroups || []).length;
            const materialGroupCount = (result.materialGroups || []).length;
            const totalGroups = entityGroupCount + materialGroupCount;
            if (totalGroups > 0) {
                const groupParts = [];
                if (entityGroupCount > 0) {
                    groupParts.push(`${entityGroupCount} entity group${entityGroupCount > 1 ? 's' : ''}`);
                }
                if (materialGroupCount > 0) {
                    groupParts.push(`${materialGroupCount} material group${materialGroupCount > 1 ? 's' : ''}`);
                }
                summary.push(groupParts.join(' + '));
            }
            const entityCount = (result.entities || []).length;
            const materialCount = (result.materials || []).length;
            if (entityCount > 0 || materialCount > 0) {
                const itemParts = [];
                if (entityCount > 0) {
                    itemParts.push(`${entityCount} entit${entityCount === 1 ? 'y' : 'ies'}`);
                }
                if (materialCount > 0) {
                    itemParts.push(`${materialCount} material${materialCount === 1 ? '' : 's'}`);
                }
                summary.push(itemParts.join(' + '));
            }
            const hasGeneralSettings = result.generalSettings && Object.values(result.generalSettings).some(v => v !== undefined);
            const hasChecktoolSettings = result.checktoolSettings && Object.values(result.checktoolSettings).some(v => v !== undefined);
            if (hasGeneralSettings) updatedSections.push('General');
            if (hasChecktoolSettings) updatedSections.push('Checktool');
            const localizationData = localStorage.getItem('fuseBox_localization');
            if (localizationData) {
                try {
                    const locale = JSON.parse(localizationData);
                    if (locale.locale && Object.keys(locale.locale).length > 0) {
                        updatedSections.push('Localization');
                    }
                } catch (e) {
                    console.error('Error parsing localization data:', e);
                }
            }
            let message = 'Configuration imported successfully!';
            const messageParts = [];
            if (summary.length > 0) {
                messageParts.push(...summary);
            }
            if (updatedSections.length > 0) {
                messageParts.push(`Updated: ${updatedSections.join(', ')}`);
            }
            if (messageParts.length > 0) {
                message += `<br><small>• ${messageParts.join('<br>• ')}</small>`;
            }
            sessionStorage.setItem('showSuccessMessage', message);
            setTimeout(() => {
                document.querySelectorAll('[data-property$=".Enabled"]').forEach(checkbox => {
                    const event = new Event('change');
                    checkbox.dispatchEvent(event);
                });
                if (window.updateParticleInputs && typeof window.updateParticleInputs === 'function') {
                    window.updateParticleInputs();
                }
                document.body.offsetHeight;
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
            }, 100);
            return result;
        } catch (error) {
            console.error('Error saving configuration:', error);
            this.showErrorMessage('Failed to save configuration. See console for details.');
            throw error;
        }
    }
    extractEntityProperties(properties) {
        const result = {};
        Object.entries(properties).forEach(([key, value]) => {
            if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                return;
            }
            result[key] = value;
        });
        if (properties.Particles) {
            result['Particles.Enabled'] = true;
            if (properties.Particles.Force !== undefined) result['Particles.Force'] = properties.Particles.Force;
            if (properties.Particles.Name !== undefined) result['Particles.Name'] = properties.Particles.Name;
            if (properties.Particles.Material !== undefined) result['Particles.Material'] = properties.Particles.Material;
            if (properties.Particles.Amount !== undefined) result['Particles.Amount'] = properties.Particles.Amount;
            if (properties.Particles.DeltaX !== undefined) result['Particles.DeltaX'] = properties.Particles.DeltaX;
            if (properties.Particles.DeltaY !== undefined) result['Particles.DeltaY'] = properties.Particles.DeltaY;
            if (properties.Particles.DeltaZ !== undefined) result['Particles.DeltaZ'] = properties.Particles.DeltaZ;
            if (properties.Particles.Speed !== undefined) result['Particles.Speed'] = properties.Particles.Speed;
            if (properties.Particles.Red !== undefined) result['Particles.Red'] = properties.Particles.Red;
            if (properties.Particles.Green !== undefined) result['Particles.Green'] = properties.Particles.Green;
            if (properties.Particles.Blue !== undefined) result['Particles.Blue'] = properties.Particles.Blue;
            if (properties.Particles.Size !== undefined) result['Particles.Size'] = properties.Particles.Size;
        }
        if (properties.Sound) {
            result['Sound.Enabled'] = true;
            if (properties.Sound.Name !== undefined) result['Sound.Name'] = properties.Sound.Name;
            if (properties.Sound.Volume !== undefined) result['Sound.Volume'] = properties.Sound.Volume;
            if (properties.Sound.Pitch !== undefined) result['Sound.Pitch'] = properties.Sound.Pitch;
        }
        return result;
    }
    extractMaterialProperties(properties) {
        const result = {};
        Object.entries(properties).forEach(([key, value]) => {
            if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                return;
            }
            if (key === 'DropMaterial' && value === null) {
                result[key] = '';
            } else {
                result[key] = value;
            }
        });
        if (properties.Particles) {
            result['Particles.Enabled'] = true;
            if (properties.Particles.Force !== undefined) result['Particles.Force'] = properties.Particles.Force;
            if (properties.Particles.Name !== undefined) result['Particles.Name'] = properties.Particles.Name;
            if (properties.Particles.Material !== undefined) result['Particles.Material'] = properties.Particles.Material;
            if (properties.Particles.Amount !== undefined) result['Particles.Amount'] = properties.Particles.Amount;
            if (properties.Particles.DeltaX !== undefined) result['Particles.DeltaX'] = properties.Particles.DeltaX;
            if (properties.Particles.DeltaY !== undefined) result['Particles.DeltaY'] = properties.Particles.DeltaY;
            if (properties.Particles.DeltaZ !== undefined) result['Particles.DeltaZ'] = properties.Particles.DeltaZ;
            if (properties.Particles.Speed !== undefined) result['Particles.Speed'] = properties.Particles.Speed;
            if (properties.Particles.Red !== undefined) result['Particles.Red'] = properties.Particles.Red;
            if (properties.Particles.Green !== undefined) result['Particles.Green'] = properties.Particles.Green;
            if (properties.Particles.Blue !== undefined) result['Particles.Blue'] = properties.Particles.Blue;
            if (properties.Particles.Size !== undefined) result['Particles.Size'] = properties.Particles.Size;
        }
        if (properties.Sound) {
            result['Sound.Enabled'] = true;
            if (properties.Sound.Name !== undefined) result['Sound.Name'] = properties.Sound.Name;
            if (properties.Sound.Volume !== undefined) result['Sound.Volume'] = properties.Sound.Volume;
            if (properties.Sound.Pitch !== undefined) result['Sound.Pitch'] = properties.Sound.Pitch;
        }
        return result;
    }
    cleanProperties(props) {
        if (!props) return {};
        return Object.fromEntries(
            Object.entries(props).filter(([, value]) => value !== undefined)
        );
    }
    showSuccessMessage(message) {
        if (window.EntityMaterialUI && typeof window.EntityMaterialUI.showNotification === 'function') {
            window.EntityMaterialUI.showNotification(message, 'success');
        } else {
            console.log('Success:', message);
        }
    }
    showErrorMessage(message) {
        if (window.EntityMaterialUI && typeof window.EntityMaterialUI.showNotification === 'function') {
            window.EntityMaterialUI.showNotification(message, 'error');
        } else {
            alert('Error: ' + message);
        }
    }
    async showUnsignedConfigWarning() {
        return new Promise((resolve) => {
            const modalId = "unsigned-config-warning";
            const existingModal = document.getElementById(modalId);
            if (existingModal) {
                const existingBackdrop = document.querySelector('.modal-backdrop');
                if (existingBackdrop) existingBackdrop.remove();
                existingModal.remove();
            }
            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
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
            modal.className = "bg-dark text-light shadow-lg rounded-3 border border-secondary";
            modal.style.width = '100%';
            modal.style.maxWidth = '500px';
            modal.style.pointerEvents = 'auto';
            modal.style.maxHeight = '80vh';
            modal.style.overflowY = 'auto';
            modal.style.transform = 'translateY(0)';
            modal.style.transition = 'transform 0.3s ease-out';
            const header = document.createElement("div");
            header.className = "d-flex justify-content-between align-items-center p-3 border-bottom border-secondary";
            header.innerHTML = `
                <h5 class="modal-title text-warning m-0 d-flex align-items-center">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    Warning: Unsigned Configuration
                </h5>
                <button type="button" class="btn-close btn-close-white" aria-label="Close"></button>
            `;
            const closeBtn = header.querySelector('button');
            const body = document.createElement("div");
            body.className = "p-3";
            body.innerHTML = `
                <p class="mb-2">This configuration file wasn't created by the FuseBox Config Generator.</p>
                <p class="mb-0">It may not be compatible with this version of the tool. <strong>Proceed with caution.</strong></p>
            `;
            const footer = document.createElement("div");
            footer.className = "d-flex justify-content-end gap-2 p-3 border-top border-secondary";
            const cancelBtn = document.createElement("button");
            cancelBtn.type = "button";
            cancelBtn.className = "btn btn-sm btn-outline-secondary";
            cancelBtn.textContent = "Cancel";
            const proceedBtn = document.createElement("button");
            proceedBtn.type = "button";
            proceedBtn.className = "btn btn-sm btn-warning";
            proceedBtn.textContent = "Proceed Anyway";
            footer.append(cancelBtn, proceedBtn);
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
            const handleProceed = () => cleanup(true);
            const handleCancel = () => cleanup(false);
            proceedBtn.addEventListener("click", handleProceed);
            cancelBtn.addEventListener("click", handleCancel);
            closeBtn.addEventListener("click", handleCancel);
            const handleKeyDown = (e) => {
                if (e.key === 'Escape') {
                    handleCancel();
                }
            };
            document.addEventListener('keydown', handleKeyDown);
            const removeEventListeners = () => {
                proceedBtn.removeEventListener("click", handleProceed);
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
}
document.addEventListener('DOMContentLoaded', () => {
    window.importManager = new ImportManager();
});
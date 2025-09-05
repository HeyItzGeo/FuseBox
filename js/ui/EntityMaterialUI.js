window.EntityMaterialUI = window.EntityMaterialUI || {};
const Config = window.EntityProperties || {};
window.EntityMaterialUI.showConfirmModal = function(title, bodyHTML, onConfirm) {
    const modal = document.createElement('div');
    modal.classList.add('modal', 'fade');
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">${title}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    ${bodyHTML}
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-danger" id="confirmDeleteBtn">Delete</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    const cleanup = () => {
        bsModal.hide();
        modal.remove();
    };
    modal.querySelector('#confirmDeleteBtn').addEventListener('click', () => {
        cleanup();
        if (onConfirm) onConfirm();
    });
};
function normalizeEntityName(name) {
    if (!name) return '';
    let normalized = name.toLowerCase()
        .replace(/^ender_?crystal$/i, 'endercrystal')
        .replace(/^end_?crystal$/i, 'endcrystal')
        .replace(/^primed_?tnt$/i, 'tnt')
        .replace(/^tnt_?minecart$/i, 'tntminecart')
        .replace(/^minecart_?tnt$/i, 'tntminecart');
    return normalized.replace(/[^a-z0-9]/g, '');
}
window.EntityMaterialUI.validateName = function(context, name, type, excludeIds = null) {
    const excludeArray = Array.isArray(excludeIds) ? excludeIds : (excludeIds ? [excludeIds] : []);
    const normalizedInput = normalizeEntityName(name);
    const hasEntityConflict = context.entities.some(entity => {
        if (excludeArray.includes(entity.id)) return false;
        if (entity.name === name) return true;
        const normalizedEntity = normalizeEntityName(entity.name);
        return normalizedEntity === normalizedInput;
    });
    const hasMaterialConflict = context.materials.some(material => {
        if (excludeArray.includes(material.id)) return false;
        if (material.name === name) return true;
        const normalizedMaterial = normalizeEntityName(material.name);
        return normalizedMaterial === normalizedInput;
    });
    const result = {
        isValid: true,
        message: '',
        conflicts: {
            entity: hasEntityConflict,
            material: hasMaterialConflict
        }
    };
    if (hasEntityConflict || hasMaterialConflict) {
        const conflictType = hasEntityConflict ? 'entity' : 'material';
        const article = /^[aeiou]/i.test(conflictType) ? 'An' : 'A';
        const existingName = hasEntityConflict
            ? context.entities.find(e => e.name === name || normalizeEntityName(e.name) === normalizedInput)?.name
            : context.materials.find(m => m.name === name || normalizeEntityName(m.name) === normalizedInput)?.name;
        result.isValid = false;
        result.message = `${article} ${conflictType} with the name "${existingName}" already exists (conflicts with "${name}")`;
    }
    return result;
};
window.EntityMaterialUI.showNotification = function(context, message, type = 'info', excludeIds = null, duration = 3000) {
    let notificationMessage = message;
    let notificationType = type;
    let notificationDuration = duration;
    let shouldValidate = false;
    let validationResult = { isValid: true };
    if (typeof context === 'string') {
        notificationMessage = context;
        notificationType = message || 'info';
    }
    else if (context && typeof context === 'object') {
        shouldValidate = true;
        if (message && type && type !== 'notification') {
            validationResult = this.validateName(context, message, type, excludeIds);
            if (validationResult.isValid) return Promise.resolve(true);
            notificationMessage = validationResult.message;
            notificationType = 'error';
        }
    }
    if (notificationType === 'notification') {
        notificationDuration = 2000;
    }
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(el => el.remove());
    const notification = document.createElement('div');
    notification.className = `notification position-fixed bottom-0 end-0 m-3 p-3 rounded shadow-lg`;
    notification.style.zIndex = '9999';
    notification.style.minWidth = '300px';
    notification.style.transition = 'opacity 0.5s, transform 0.3s ease';
    notification.style.transform = 'translateY(100px)';
    notification.style.opacity = '0';
    const typeStyles = {
        success: {
            bg: 'bg-dark',
            icon: 'bi-check-circle',
            text: 'text-white',
            textMuted: 'text-muted'
        },
        error: {
            bg: 'bg-dark',
            icon: 'bi-exclamation-triangle',
            text: 'text-white',
            textMuted: 'text-muted'
        },
        warning: {
            bg: 'bg-dark',
            icon: 'bi-exclamation-triangle',
            text: 'text-white',
            textMuted: 'text-muted'
        },
        info: {
            bg: 'bg-dark',
            icon: 'bi-info-circle',
            text: 'text-white',
            textMuted: 'text-muted'
        },
        notification: {
            bg: 'bg-dark',
            icon: 'bi-bell',
            text: 'text-white',
            textMuted: 'text-muted'
        }
    };
    const style = typeStyles[notificationType] || typeStyles.notification;
    notification.classList.add(style.bg, style.text, 'border-0');
    const countdownSeconds = Math.ceil(notificationDuration / 1000);
    notification.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <div class="d-flex flex-column">
                <span>${notificationMessage}</span>
                <small class="${style.textMuted}">Auto-dismiss in <span class="countdown-timer">${countdownSeconds}</span>s</small>
            </div>
            <button type="button" class="btn-close btn-close-white" aria-label="Close"></button>
        </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    }, 100);
    let countdown = countdownSeconds;
    const countdownEl = notification.querySelector('.countdown-timer');
    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdownEl) countdownEl.textContent = countdown;
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            removeNotification();
        }
    }, 1000);
    const closeBtn = notification.querySelector('.btn-close');
    const removeNotification = () => {
        clearInterval(countdownInterval);
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(100px)';
        setTimeout(() => notification.remove(), 500);
    };
    closeBtn.addEventListener('click', removeNotification);
    setTimeout(removeNotification, notificationDuration);
    return Promise.resolve(validationResult.isValid);
};
document.addEventListener('DOMContentLoaded', () => {
    window.EntityMaterialUI.showNameValidationModal = function(context, name, type, excludeIds = null) {
        return this.showNotification(context, name, type, excludeIds, 5000);
    };
});
window.EntityMaterialUI.createSoundsTab = function(prefix = '') {
    const soundProps = Config.getSoundProperties ? Config.getSoundProperties() : {};
    const booleanProps = [];
    const otherProps = [];
    for (const [prop, config] of Object.entries(soundProps)) {
        if (config.type === 'boolean') {
            booleanProps.push({prop, config});
        } else {
            otherProps.push({prop, config});
        }
    }
    const enabledProp = booleanProps.find(p => p.prop.endsWith('.Enabled'));
    let html = `
    <div class="tab-pane fade" id="${prefix}sounds" role="tabpanel" aria-labelledby="${prefix}sounds-tab">
        <div class="particles-tab-container compact">
            <h5 class="tab-section-title">Sound Settings</h5>
            <!-- Toggles Card -->
            ${booleanProps.length ? `
            <div class="card particle-card compact">
                <div class="card-body compact-grid">
                    ${booleanProps.map(({prop, config}) => {
                        const inputId = `${prefix}sound-${prop.toLowerCase().replace(/\./g, '-')}`;
                        const displayName = prop.split('.').pop();
                        const checked = config.default === 'true' ? 'checked' : '';
                        const isEnabled = prop.endsWith('.Enabled');
                        return `
                        <div class="compact-item" style="cursor: pointer; user-select: none; -webkit-user-select: none;"
                             onclick="document.getElementById('${inputId}').click()">
                            <div class="form-check form-switch p-2 border rounded" title="${config.description}">
                                <div class="d-flex justify-content-between align-items-center">
                                    <label class="form-check-label flex-grow-1" for="${inputId}" style="cursor: pointer;">
                                        ${displayName}
                                    </label>
                                    <input class="form-check-input" type="checkbox"
                                           id="${inputId}" ${checked} data-property="${prop}"
                                           ${!isEnabled && enabledProp && enabledProp.config.default !== 'true' ? 'disabled' : ''}>
                                </div>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>` : ''}
            <!-- Properties Card -->
            <div class="card particle-card compact mt-3">
                <div class="card-body detail-grid compact">
                    ${otherProps.map(({prop, config}) => {
                        const inputId = `${prefix}sound-${prop.toLowerCase().replace(/\./g, '-')}`;
                        const displayName = prop.split('.').pop();
                        const isEnabled = enabledProp?.config.default === 'true';
                        const disabled = !isEnabled ? 'disabled' : '';
                        const disabledClass = disabled ? 'disabled-input' : '';
                        if (config.type === 'select' && prop.endsWith('.Name')) {
                            const categories = {
                                'ambient': { label: '-=[ Ambient ]=-', items: [] },
                                'blocks': { label: '-=[ Blocks ]=-', items: [] },
                                'hostile': { label: '-=[ Hostile Mobs ]=-', items: [] },
                                'passive': { label: '-=[ Passive Mobs ]=-', items: [] },
                                'neutral': { label: '-=[ Neutral Mobs ]=-', items: [] },
                                'boss': { label: '-=[ Boss Mobs ]=-', items: [] },
                                'player': { label: '-=[ Player ]=-', items: [] },
                                'items': { label: '-=[ Items ]=-', items: [] },
                                'ui': { label: '-=[ UI ]=-', items: [] },
                                'music': { label: '-=[ Music ]=-', items: [] },
                                'water': { label: '-=[ Water ]=-', items: [] },
                                'other': { label: '-=[ Other ]=-', items: [] }
                            };
                            config.options.forEach(option => {
                                const category = option.category || 'other';
                                if (categories[category]) {
                                    categories[category].items.push(option);
                                } else {
                                    categories.other.items.push(option);
                                }
                            });
                            let selectHtml = `
                            <div class="form-group">
                                <label class="form-label small mb-1" for="${inputId}" title="${config.description}">${displayName}</label>
                                <select class="form-select form-select-sm ${disabledClass}"
                                        id="${inputId}" data-property="${prop}" ${disabled}>`;
                            let firstSound = null;
                            for (const category of Object.values(categories)) {
                                if (category.items.length > 0) {
                                    firstSound = category.items[0].value;
                                    break;
                                }
                            }
                            Object.entries(categories).forEach(([key, category]) => {
                                if (category.items.length > 0) {
                                    selectHtml += `
                                    <optgroup label="${category.label}">
                                        ${category.items.map(option =>
                                            `<option value="${option.value}" ${option.value === (config.default || firstSound) ? 'selected' : ''}>
                                                ${option.label}
                                            </option>`
                                        ).join('')}
                                    </optgroup>`;
                                }
                            });
                            selectHtml += `
                                </select>
                            </div>`;
                            return selectHtml;
                        } else if (config.type === 'select') {
                            return `
                            <div class="form-group">
                                <label class="form-label small mb-1" for="${inputId}" title="${config.description}">${displayName}</label>
                                <select class="form-select form-select-sm ${disabledClass}"
                                        id="${inputId}" data-property="${prop}" ${disabled}>
                                    ${config.options.map(option =>
                                        `<option value="${option.value}" ${option.value === config.default ? 'selected' : ''}>
                                            ${option.label}
                                        </option>`
                                    ).join('')}
                                </select>
                            </div>`;
                        } else if (config.type === 'range') {
                            return `
                            <div class="form-group">
                                <label class="form-label small mb-1 d-flex justify-content-between">
                                    <span>${displayName}</span>
                                    <span class="range-value">${config.default}</span>
                                </label>
                                <input type="range" class="form-range form-range-sm"
                                       id="${inputId}" data-property="${prop}"
                                       value="${config.default}"
                                       min="${config.min}" max="${config.max}" step="${config.step || 0.1}"
                                       oninput="this.previousElementSibling.querySelector('.range-value').textContent = this.value"
                                       ${disabled}>
                            </div>`;
                        } else {
                            return `
                            <div class="form-group">
                                <label class="form-label small mb-1" for="${inputId}" title="${config.description}">
                                    ${displayName}
                                </label>
                                <input type="${config.type}" class="form-control form-control-sm ${disabledClass}"
                                       id="${inputId}" data-property="${prop}"
                                       value="${config.default}"
                                       placeholder="${config.placeholder || ''}"
                                       ${config.min !== undefined ? `min="${config.min}"` : ''}
                                       ${config.max !== undefined ? `max="${config.max}"` : ''}
                                       ${config.step !== undefined ? `step="${config.step}"` : ''}
                                       ${disabled}>
                            </div>`;
                        }
                    }).join('')}
                </div>
            </div>
        </div>
    </div>`;
    if (typeof document !== 'undefined' && enabledProp) {
        const enabledCheckbox = document.getElementById(`${prefix}sound-enabled`);
        if (enabledCheckbox) {
            enabledCheckbox.addEventListener('change', function() {
                const soundControls = document.querySelectorAll(`#${prefix}sounds input:not(#${prefix}sound-enabled), #${prefix}sounds select`);
                soundControls.forEach(control => {
                    control.disabled = !this.checked;
                    control.classList.toggle('disabled-input', !this.checked);
                });
            });
        }
    }
    return html;
};
window.EntityMaterialUI.createParticlesTab = function(prefix = '') {
    const particleProps = Config.getParticleProperties ? Config.getParticleProperties() : {};
    const booleanProps = [], nameMaterialProps = [], otherProps = [];
    for (const [prop, config] of Object.entries(particleProps)) {
        if (prop === 'Particles.Name' || prop === 'Particles.Material') {
            nameMaterialProps.push({ prop, config });
        } else if (config.type === 'boolean') {
            booleanProps.push({ prop, config });
        } else {
            otherProps.push({ prop, config });
        }
    }
    const getProp = propName => booleanProps.find(p => p.prop === propName) || nameMaterialProps.find(p => p.prop === propName);
    const enabledProp = getProp('Particles.Enabled');
    const forceProp = getProp('Particles.Force');
    const nameProp = getProp('Particles.Name');
    const materialProp = getProp('Particles.Material');
    const isEnabledDefault = enabledProp?.config.default === 'true';
    const renderBooleanSwitch = (prop, label) => {
        if (!prop) return '';
        const isForce = prop.prop === 'Particles.Force';
        const disabled = isForce && !isEnabledDefault;
        const opacity = disabled ? '0.6' : '1';
        const bgColor = disabled ? '#e9ecef' : '';
        const borderColor = disabled ? '#ced4da' : '';
        const cursor = 'pointer';
        const labelColor = disabled ? '#6c757d' : 'inherit';
        const inputId = `${prefix}particle-${prop.prop.toLowerCase().replace(/\./g, '-')}`;
        return `
        <div class="compact-item form-check form-switch p-2 border rounded"
             style="user-select: none; -webkit-user-select: none; opacity: ${opacity}; background-color: ${bgColor}; border-color: ${borderColor};"
             title="${prop.config.description}">
            <div class="d-flex justify-content-between align-items-center">
                <label class="form-check-label flex-grow-1" for="${inputId}"
                       style="cursor: pointer; color: ${labelColor};">
                    ${label}
                </label>
                <input class="form-check-input ${disabled ? 'disabled-input' : ''}"
                       type="checkbox"
                       id="${inputId}"
                       data-property="${prop.prop}"
                       onchange="
                           if('${prop.prop}' === 'Particles.Enabled') {
                               const forceInput = document.getElementById('${prefix}particle-particles-force');
                               const forceContainer = forceInput?.closest('.form-switch');
                               if (forceInput) {
                                   forceInput.disabled = !this.checked;
                                   forceInput.classList.toggle('disabled-input', !this.checked);
                               }
                               if (forceContainer) {
                                   forceContainer.style.opacity = this.checked ? '1' : '0.6';
                                   forceContainer.style.backgroundColor = this.checked ? '' : '#e9ecef';
                                   forceContainer.style.borderColor = this.checked ? '' : '#ced4da';
                                   const labelEl = forceContainer.querySelector('label');
                                   if (labelEl) {
                                       labelEl.style.color = this.checked ? 'inherit' : '#6c757d';
                                   }
                               }
                           }
                       "
                       ${disabled ? 'disabled' : ''}>
            </div>
        </div>`;
    };
    const renderNameMaterial = (prop, label) => {
        if (!prop) return '';
        const inputId = `${prefix}particle-${prop.prop.toLowerCase().replace(/\./g, '-')}`;
        if (prop.prop === 'Particles.Name') {
            const categories = {
                'rgb': { label: '-=[ RGB Color Particles ]=-', items: [] },
                'material': { label: '-=[ Block Particles (Require Material) ]=-', items: [] },
                'standard': { label: '-=[ Standard Particles ]=-', items: [] },
                'environmental': { label: '-=[ Environmental ]=-', items: [] },
                'combat': { label: '-=[ Combat ]=-', items: [] },
                'special': { label: '-=[ Special Effects ]=-', items: [] }
            };
            prop.config.options.forEach(option => {
                const cat = option.category || 'standard';
                if (categories[cat]) {
                    categories[cat].items.push(option);
                } else {
                    categories.standard.items.push(option);
                }
            });
            const optionGroups = Object.entries(categories)
                .filter(([_, cat]) => cat.items.length > 0)
                .map(([_, cat]) => {
                    const options = cat.items
                        .map(o => `<option value="${o.value}" ${o.value === prop.config.default ? 'selected' : ''}>${o.label}</option>`)
                        .join('');
                    return `<optgroup label="${cat.label}">${options}</optgroup>`;
                })
                .join('');
            return `
            <div class="compact-item" title="${prop.config.description}">
                <label class="form-label small mb-1">${label}</label>
                <select class="form-select form-select-sm" id="${inputId}" data-property="${prop.prop}">
                    ${optionGroups}
                </select>
            </div>`;
        } else if (prop.prop === 'Particles.Material') {
            setTimeout(() => {
                const input = document.getElementById(inputId);
                if (input) {
                    const originalSetup = window.autocompleteUtils?.setupMaterialNameInput;
                    if (originalSetup) {
                        window.autocompleteUtils.setupMaterialNameInput = function(...args) {
                            const result = originalSetup.apply(this, args);
                            input.addEventListener('keydown', (e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    e.stopImmediatePropagation();
                                    const currentValue = input.value.trim().toUpperCase();
                                    if (!currentValue) return false;
                                    const commonBlocks = window.EntityProperties?.getCommonBlocks?.() || [];
                                    const matchingBlock = commonBlocks.find(block =>
                                        block.toUpperCase().startsWith(currentValue)
                                    );
                                    if (matchingBlock) {
                                        input.value = matchingBlock;
                                        input.dispatchEvent(new Event('input', { bubbles: true }));
                                        input.dispatchEvent(new Event('change', { bubbles: true }));
                                    }
                                    return false;
                                }
                            }, true);
                            return result;
                        };
                    }
                    if (window.autocompleteUtils && window.autocompleteUtils.setupMaterialNameInput) {
                        window.autocompleteUtils.setupMaterialNameInput(input);
                    }
                    if (originalSetup) {
                        setTimeout(() => {
                            window.autocompleteUtils.setupMaterialNameInput = originalSetup;
                        }, 0);
                    }
                }
            }, 0);
            return `
            <div class="compact-item" title="${prop.config.description}">
                <label class="form-label small mb-1">${label}</label>
                <input type="text" class="form-control form-control-sm" id="${inputId}" data-property="${prop.prop}" value="${prop.config.default}" autocomplete="off">
            </div>`;
        }
        return '';
    };
    const renderOtherProps = otherProps.map(({ prop, config }) => {
        const inputId = `${prefix}particle-${prop.toLowerCase().replace(/\./g, '-')}`;
        const disabled = !isEnabledDefault ? 'disabled' : '';
        const disabledClass = disabled ? 'disabled-input' : '';
        const displayName = prop.split('.').pop();
        if (config.type === 'select') {
            return `
            <div class="form-group">
                <label class="form-label small mb-1" for="${inputId}" title="${config.description}">${displayName}</label>
                <select class="form-select form-select-sm ${disabledClass}" id="${inputId}" data-property="${prop}" ${disabled}>
                    ${config.options.map(o => `<option value="${o.value}" ${o.value === config.default ? 'selected':''}>${o.label}</option>`).join('')}
                </select>
            </div>`;
        } else if (config.type === 'range') {
            return `
            <div class="form-group">
                <label class="form-label small mb-1 d-flex justify-content-between">
                    <span>${displayName}</span>
                    <span class="range-value">${config.default}</span>
                </label>
                <input type="range" class="form-range form-range-sm" id="${inputId}" data-property="${prop}"
                       value="${config.default}" min="${config.min}" max="${config.max}" step="${config.step || 0.1}"
                       oninput="this.previousElementSibling.querySelector('.range-value').textContent = this.value" ${disabled}>
            </div>`;
        } else {
            return `
            <div class="form-group">
                <label class="form-label small mb-1" for="${inputId}" title="${config.description}">${displayName}</label>
                <input type="${config.type}" class="form-control form-control-sm ${disabledClass}"
                       id="${inputId}" data-property="${prop}" value="${config.default}" placeholder="${config.placeholder || ''}" ${disabled}>
            </div>`;
        }
    }).join('');
    const html = `
    <div class="tab-pane fade" id="${prefix}particles" role="tabpanel" aria-labelledby="${prefix}particles-tab">
        <div class="particles-tab-container compact">
            <h5 class="tab-section-title">Particle Settings</h5>
            <div class="card particle-card compact">
                <div class="card-body compact-grid">
                    ${renderBooleanSwitch(enabledProp, 'Enabled')}
                    ${renderBooleanSwitch(forceProp, 'Force')}
                    ${renderNameMaterial(nameProp, 'Particle')}
                    ${renderNameMaterial(materialProp, 'Material')}
                </div>
            </div>
            <div class="card particle-card compact">
                <div class="card-body detail-grid compact">
                    ${renderOtherProps}
                </div>
            </div>
        </div>
    </div>`;
    const updateInputs = () => {
        const nameSelect = document.getElementById(`${prefix}particle-particles-name`);
        const materialInput = document.getElementById(`${prefix}particle-particles-material`);
        if (!nameSelect || !materialInput) return;
        const particleType = nameSelect.value;
        const isDust = particleType === 'DUST';
        const isBlockType = [
            'BLOCK', 'BLOCK_CRACK', 'BLOCK_DUST',
            'BLOCK_MARKER', 'DUST_PILLAR', 'FALLING_DUST'
        ].includes(particleType);
        document.querySelectorAll(`input[id$='-red'], input[id$='-green'], input[id$='-blue']`).forEach(input => {
            if (!input) return;
            if (isDust) {
                input.classList.remove('rgb-disabled');
                input.disabled = false;
            } else {
                input.classList.add('rgb-disabled');
                input.disabled = true;
            }
        });
        if (isBlockType) {
            materialInput.classList.remove('rgb-disabled');
            materialInput.disabled = false;
        } else {
            materialInput.classList.add('rgb-disabled');
            materialInput.disabled = true;
        }
    };
    const setupParticleEventListeners = () => {
        const enabledCheckbox = document.getElementById(`${prefix}particle-particles-enabled`);
        const nameSelect = document.getElementById(`${prefix}particle-particles-name`);
        if (!enabledCheckbox || !nameSelect) {
            setTimeout(setupParticleEventListeners, 100);
            return;
        }
        enabledCheckbox.addEventListener('change', function() {
            document.querySelectorAll(`#${prefix}particles input, #${prefix}particles select`).forEach(c => {
                if (c.id !== `${prefix}particle-particles-enabled`) {
                    c.disabled = !this.checked;
                    c.classList.toggle('disabled-input', !this.checked);
                }
            });
            updateInputs();
        });
        const onParticleTypeChange = () => updateInputs();
        nameSelect.addEventListener('change', onParticleTypeChange);
        nameSelect.addEventListener('input', onParticleTypeChange);
        updateInputs();
    };
    setupParticleEventListeners();
    return html;
};
const style = document.createElement('style');
style.innerHTML = `
.particles-tab-container.compact {
    padding: 0.75rem;
    font-family: 'Segoe UI', sans-serif;
}
.particle-card.compact {
    margin-bottom: 0.75rem;
    border-radius: 0.25rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    border: 1px solid #e0e0e0;
    background: #fff;
}
.tab-section-title {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    color: #333;
    font-weight: 600;
}
.compact-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
    padding: 0.5rem;
}
.compact-item {
    display: flex;
    flex-direction: column;
}
.detail-grid.compact {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.75rem;
    padding: 0.5rem;
}
.form-group {
    margin-bottom: 0.5rem;
}
.btn-close {
    width: 20px;
    height: 20px;
    padding: 4px;
    background: #dc3545;
    opacity: 1;
    border-radius: 50%;
    position: relative;
    transition: all 0.2s ease;
}
.btn-close:hover {
    background: #c82333;
    transform: scale(1.1);
}
.btn-close::before, .btn-close::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 12px;
    height: 2px;
    background: white;
    margin-left: -6px;
    border-radius: 1px;
}
.btn-close::before {
    transform: translateY(-50%) rotate(45deg);
}
.btn-close::after {
    transform: translateY(-50%) rotate(-45deg);
}
.btn-close:focus {
    box-shadow: 0 0 0 0.25rem rgba(220, 53, 69, 0.25);
}
.form-label {
    margin-bottom: 0.25rem;
    color: #555;
    font-size: 0.75rem;
    font-weight: 500;
}
.range-value {
    color: #3b82f6;
    font-family: 'Courier New', monospace;
    font-size: 1em;
    font-weight: 700;
    min-width: 2.5em;
    text-align: right;
    background: transparent;
    padding: 0 4px;
    border-radius: 3px;
}
.disabled-input {
    opacity: 0.6;
    pointer-events: none;
    background-color: #f8f9fa;
}
.form-control-sm,
.form-select-sm {
    padding: 0.25rem 0.5rem;
    font-size: 0.8rem;
    line-height: 1.3;
    height: auto;
}
.form-switch .form-check-input {
    margin-left: 0;
    margin-right: 0.5rem;
}
.form-group + .form-group {
    margin-top: 0.25rem;
}
.form-text {
    white-space: pre-line;
    color: #adb5bd;
    font-size: 0.8rem;
    line-height: 1.4;
    margin-top: 0.3rem;
}
`;
document.head.appendChild(style);
window.EntityMaterialUI.addNumberInputValidation = function(inputElement) {
    inputElement.addEventListener('keydown', (e) => {
        if ([8, 9, 27, 13, 110, 190, 189].includes(e.keyCode) ||
            (e.ctrlKey && [65, 67, 86, 88].includes(e.keyCode)) ||
            (e.keyCode >= 35 && e.keyCode <= 40)) {
            return;
        }
        if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) &&
            (e.keyCode < 96 || e.keyCode > 105) &&
            (e.keyCode !== 190 && e.keyCode !== 110) &&
            (e.keyCode !== 189)) {
            e.preventDefault();
        }
    });
}
window.EntityMaterialUI.createEntityForm = function(prefix = '', showPresetDropdown = true) {
    const form = document.createElement('form');
    form.id = 'entity-form';
    const materialProperties = window.EntityProperties.getMaterialProperties();
    const entityCategories = window.EntityProperties.getEntityCategories();
    const allEntities = [];
    for (const [category, entities] of Object.entries(entityCategories)) {
        allEntities.push({name: '', category: 'header', display: `── ${category} ──`});
        entities.forEach(entity => allEntities.push({name: entity, category: category, display: entity}));
    }
    const setupAutocomplete = () => {
        const entityNameInput = form.querySelector('#entity-name');
        const entityPreset = form.querySelector('#entity-preset');
        if (entityNameInput && entityPreset) {
            window.autocompleteUtils.setupEntityNameInput(entityNameInput, entityPreset);
        }
    };
    setTimeout(setupAutocomplete, 0);
    let formHTML = `
        <style>
            .entity-selector {display:flex; gap:4px; margin-bottom:4px;}
            .entity-selector select {flex:0 0 180px;}
            .entity-selector input {flex:1;}
            .entity-hint {font-size:0.75rem; color:#6c757d; margin-top:2px;}
            .form-check {margin-bottom:2px;}
            .tab-content {padding:4px 0;}
            .compact-input {width:100%; margin-bottom:2px;}
            .compact-row {display:flex; flex-wrap:wrap; gap:4px;}
            .compact-row > input {flex:1 1 100px;}
            input[id$='-red'],
            input[id$='-green'],
            input[id$='-blue'],
            input[id$='-material'] {
                transition: opacity 0.2s, background-color 0.2s;
            }
            input[id$='-red'].rgb-disabled,
            input[id$='-green'].rgb-disabled,
            input[id$='-blue'].rgb-disabled,
            input[id$='-material'].rgb-disabled {
                opacity: 0.6;
                background-color: #e9ecef !important;
                pointer-events: none;
            }
            .range-value {
                color: #3b82f6;
                font-family: 'Courier New', monospace;
                font-size: 1em;
                font-weight: 700;
                min-width: 2.5em;
                text-align: right;
                background: transparent;
                padding: 0 4px;
                border-radius: 3px;
            }
            .range-value.disabled {
                opacity: 0.6;
                color: #6c757d;
            }
        </style>
        <div>
            <label for="entity-name" class="form-label fw-bold">${showPresetDropdown ? 'Entity Name' : 'Group Name'}</label>
            <div class="entity-selector">
                ${showPresetDropdown ? `
                    <select class="form-select" id="entity-preset">
                        <option value="" selected>-- Preset --</option>
                        ${allEntities.map(e => e.category==='header'? `<option disabled>${e.display}</option>` : `<option value="${e.name}">${e.name} (${e.category})</option>`).join('')}
                    </select>
                ` : ''}
                <input type="text" class="form-control form-control-sm" id="entity-name" name="entity-name" placeholder="${showPresetDropdown ? 'WITHER, PRIMED_TNT...' : 'Enter group name'}" required>
            </div>
            ${showPresetDropdown ? '<div class="entity-hint mb-4" style="margin-bottom: 1.5rem !important;">Type an entity name or select a preset</div>' : ''}
        </div>
        <div class="tab-content" id="${prefix}tabsContent">
            <!-- Entity Properties Tab -->
            <div class="tab-pane fade show active" id="${prefix}properties" role="tabpanel" aria-labelledby="${prefix}properties-tab">
                <div class="row g-3">
    `;
    const entityProperties = window.EntityProperties.getEntityProperties();
    const numericProps = Object.entries(entityProperties).filter(([_,c])=>c.type==='number');
    if(numericProps.length>0) {
        formHTML += `
        <div class="mb-3">
            <h5 class="form-label fw-bold mb-3 text-center" style="font-size: 1.1rem; width: 100%;">Numeric Properties</h5>
            <div class="d-flex flex-nowrap justify-content-center align-items-start w-100 overflow-auto" style="gap: 1rem; padding: 0.5rem 0;">
        `;
        numericProps.forEach(([prop, config]) => {
            const inputId = `entity-prop-${prop.toLowerCase()}`;
            const displayName = prop.replace(/([A-Z])/g, ' $1').trim();
            formHTML += `
                <div class="numeric-property">
                    <label for="${inputId}" title="${config.description}">
                        ${displayName}
                    </label>
                    <input type="number"
                           class="form-control form-control-sm"
                           id="${inputId}"
                           value="${parseFloat(config.default).toFixed(1)}"
                           step="0.1"
                           placeholder="${config.placeholder||'0.0'}"
                           min="${config.min}"
                           max="${config.max}"
                           step="${config.step}"
                           data-property="${prop}"
                           title="${config.description}" />
                </div>
            `;
        });
        formHTML += `
            </div>
        </div>`;
    }
    formHTML += `
    <ul class="nav nav-tabs mb-2" id="${prefix}entityTabs" role="tablist">
        <li class="nav-item">
            <button class="nav-link active" id="${prefix}booleans-tab" data-bs-toggle="tab" data-bs-target="#${prefix}booleans" type="button" role="tab" aria-controls="${prefix}booleans" aria-selected="true">Booleans</button>
        </li>
        <li class="nav-item">
            <button class="nav-link" id="${prefix}particles-tab" data-bs-toggle="tab" data-bs-target="#${prefix}particles" type="button" role="tab" aria-controls="${prefix}particles" aria-selected="false" data-disabled="true">Particle Effects</button>
        </li>
        <li class="nav-item">
            <button class="nav-link" id="${prefix}sounds-tab" data-bs-toggle="tab" data-bs-target="#${prefix}sounds" type="button" role="tab" aria-controls="${prefix}sounds" aria-selected="false" data-disabled="true">Sound Effects</button>
        </li>
    </ul>
    <div class="tab-content">
        <!-- Boolean Properties -->
        <div class="tab-pane fade show active" id="${prefix}booleans">
            <div class="row g-2 mb-3">
            ${Object.entries(entityProperties).filter(([_,c])=>c.type==='boolean').map(([prop, config]) => {
                const inputId = `entity-prop-${prop.toLowerCase()}`;
                const checked = config.default==='true' ? 'checked' : '';
                const displayText = prop.replace(/([A-Z])/g, ' $1').trim();
                return `
                <div class="col-3">
                    <div class="tile-checkbox card h-100" title="${config.description}">
                    <div class="card-body p-2 d-flex flex-column">
                        <div class="form-check form-switch mb-1">
                            <input class="form-check-input" type="checkbox" id="${inputId}" ${checked} data-property="${prop}">
                            <label class="form-check-label" for="${inputId}" style="display:none;">${prop}</label>
                        </div>
                        <div class="tile-label flex-grow-1 d-flex align-items-center"
                             style="font-size:0.8rem; word-break: break-word; cursor: pointer; min-height: 40px;">
                            ${displayText}
                        </div>
                    </div>
                </div>
                </div>`;
            }).join('')}
            </div>
        </div>
        <!-- Particle & Sound Tabs -->
        ${window.EntityMaterialUI.createParticlesTab(prefix)}
        ${window.EntityMaterialUI.createSoundsTab(prefix)}
    </div>
    `;
    formHTML += `<div class="d-grid mt-2"><button type="submit" class="btn btn-sm btn-primary">Next: Add Material</button></div>`;
    form.innerHTML = formHTML;
    form.setAttribute('novalidate','');
    form.addEventListener('click', (e) => {
        const tile = e.target.closest('.tile-checkbox, .tile-checkbox *, .card[data-property], .card[data-property] *');
        if (!tile) return;
        const container = tile.closest('.tile-checkbox') || tile.closest('.card[data-property]');
        if (!container) return;
        const checkbox = container.querySelector('input[type="checkbox"]');
        if (checkbox) {
            if (e.target !== checkbox) {
                e.preventDefault();
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                checkbox.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
    });
    const presetSelect = form.querySelector('#entity-preset');
    const nameInput = form.querySelector('#entity-name');
    if (presetSelect && nameInput) {
        presetSelect.addEventListener('change', () => {
            if (presetSelect.value) {
                nameInput.value = presetSelect.value;
            }
        });
        nameInput.addEventListener('input', () => {
            if (presetSelect) {
                presetSelect.selectedIndex = 0;
            }
        });
    }
    const updateParticleInputs = () => {
        const nameSelect = document.getElementById(`${prefix}particle-particles-name`);
        if (!nameSelect) return;
        const particleType = nameSelect.value;
        const isDust = particleType === 'DUST';
        const isBlockType = [
            'BLOCK', 'BLOCK_CRACK', 'BLOCK_DUST',
            'BLOCK_MARKER', 'DUST_PILLAR', 'FALLING_DUST'
        ].includes(particleType);
        const redInput = document.getElementById(`${prefix}particle-particles-red`);
        const greenInput = document.getElementById(`${prefix}particle-particles-green`);
        const blueInput = document.getElementById(`${prefix}particle-particles-blue`);
        const materialInput = document.getElementById(`${prefix}particle-particles-material`);
        const sizeInput = document.getElementById(`${prefix}particle-particles-size`);
        [redInput, greenInput, blueInput, sizeInput].forEach(input => {
            if (input) {
                if (isDust) {
                    input.classList.remove('rgb-disabled');
                    input.disabled = false;
                } else {
                    input.classList.add('rgb-disabled');
                    input.disabled = true;
                }
            }
        });
        if (materialInput) {
            if (isBlockType) {
                materialInput.classList.remove('rgb-disabled');
                materialInput.disabled = false;
            } else {
                materialInput.classList.add('rgb-disabled');
                materialInput.disabled = true;
            }
        }
    };
    setTimeout(() => {
        const toggleInputs = (checkbox, selectorPrefix) => {
            if (!checkbox) return;
            const enabled = checkbox.checked;
            const container = checkbox.closest('.tab-pane') || document;
            const controls = container.querySelectorAll(
                `#${selectorPrefix} input:not([id$="-enabled"]), #${selectorPrefix} select`
            );
            controls.forEach(control => {
                control.disabled = !enabled;
                control.classList.toggle('disabled-input', !enabled);
                if (control.type === 'range') {
                    const valueDisplay = control.previousElementSibling?.querySelector('.range-value');
                    if (valueDisplay) {
                        valueDisplay.classList.toggle('disabled', !enabled);
                    }
                }
            });
        };
        const soundTab = form.querySelector(`#${prefix}sounds`);
        if (soundTab) {
            const soundEnabled = soundTab.querySelector(`[data-property$=".enabled"], [data-property$=".Enabled"]`);
            if (soundEnabled) {
                const initialEnabled = soundEnabled.checked;
                soundEnabled.checked = !initialEnabled;
                toggleInputs(soundEnabled, `${prefix}sounds`);
                soundEnabled.checked = initialEnabled;
                toggleInputs(soundEnabled, `${prefix}sounds`);
                soundEnabled.addEventListener('change', (e) => {
                    toggleInputs(e.target, `${prefix}sounds`);
                });
                const soundsTab = form.querySelector(`#${prefix}sounds-tab`);
                if (soundsTab) {
                    soundsTab.removeAttribute('data-disabled');
                    soundsTab.classList.remove('disabled');
                    const soundControls = form.querySelectorAll(`#${prefix}sounds input:not([id$="-enabled"]), #${prefix}sounds select`);
                    soundControls.forEach(control => {
                        control.disabled = !initialEnabled;
                        control.classList.toggle('disabled-input', !initialEnabled);
                    });
                }
            }
        }
        const particleEnabledCheckbox = document.getElementById(`${prefix}particle-particles-enabled`);
        if (particleEnabledCheckbox) {
            const toggleParticleInputs = (enabled) => {
                const particleControls = document.querySelectorAll(`#${prefix}particles input:not(#${prefix}particle-particles-enabled), #${prefix}particles select`);
                particleControls.forEach(control => {
                    control.disabled = !enabled;
                    control.classList.toggle('disabled-input', !enabled);
                    if (control.type === 'range') {
                        const valueDisplay = control.previousElementSibling?.querySelector('.range-value');
                        if (valueDisplay) {
                            valueDisplay.classList.toggle('disabled', !enabled);
                        }
                    }
                });
                const forceCheckbox = document.getElementById(`${prefix}particle-particles-force`);
                if (forceCheckbox) {
                    forceCheckbox.disabled = !enabled;
                    forceCheckbox.classList.toggle('disabled-input', !enabled);
                    const forceContainer = forceCheckbox.closest('.form-switch');
                    if (forceContainer) {
                        forceContainer.style.opacity = enabled ? '1' : '0.6';
                        forceContainer.style.backgroundColor = enabled ? '' : '#e9ecef';
                        forceContainer.style.borderColor = enabled ? '' : '#ced4da';
                        const labelEl = forceContainer.querySelector('label');
                        if (labelEl) {
                            labelEl.style.color = enabled ? 'inherit' : '#6c757d';
                            labelEl.style.cursor = enabled ? 'pointer' : 'default';
                        }
                    }
                }
                updateParticleInputs();
            };
            toggleParticleInputs(particleEnabledCheckbox.checked);
            particleEnabledCheckbox.addEventListener('change', (e) => {
                toggleParticleInputs(e.target.checked);
            });
        }
        const nameSelect = document.getElementById(`${prefix}particle-particles-name`);
        if (nameSelect) {
            nameSelect.addEventListener('change', updateParticleInputs);
            updateParticleInputs();
        }
    }, 100);
    return form;
};
window.EntityMaterialUI.getOrCreateModal = function(type) {
    const modalId = `${type}-modal`;
    let modal = document.getElementById(modalId);
    if (!modal) {
        const isGroupType = type.endsWith('-group');
        const baseType = isGroupType ? type.replace('-group', '') : type;
        const title = isGroupType ? `Add/Edit ${baseType.charAt(0).toUpperCase() + baseType.slice(1)} Group` :
                     (type === 'entity' ? 'Add/Edit Entity' : 'Add/Edit Material');
        modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = modalId;
        modal.tabIndex = -1;
        modal.setAttribute('aria-hidden', 'true');
        modal.setAttribute('aria-labelledby', `${modalId}-label`);
        let modalContent = `
            <div class="modal-dialog modal-dialog-centered" role="document" style="width: 800px; max-width: 85%; max-height: 70vh; transform: scale(0.9); transform-origin: center top; margin-top: 1rem;">
                <div class="modal-content d-flex flex-column" style="max-height: 100%;">
                    <div class="modal-header p-1 px-2">
                        <h5 class="modal-title fs-6 m-0" id="${modalId}-label">${title}</h5>
                        <button type="button" class="btn-close btn-close-sm m-0" data-bs-dismiss="modal" aria-label="Close" style="transform: scale(0.8);"></button>
                    </div>
                    <div class="modal-body p-0 flex-grow-1 d-flex flex-column" style="overflow: hidden; font-size: 0.8125rem;">`;
        if (isGroupType) {
            modalContent += `
                        <div class="row g-0 h-100">
                            <div class="col-xxl-8 col-lg-7 d-flex flex-column" style="border-right: 1px solid var(--border-color);">
                                <div id="${type}-form-container" class="p-1 flex-grow-1" style="overflow-y: auto; min-width: 0; max-width: 100%;">
                                    <!-- Form content will be loaded here -->
                                </div>
                            </div>
                            <div class="col-xxl-4 col-lg-5 d-flex flex-column" style="background-color: var(--bg-secondary);">
                                <div class="p-1 border-bottom">
                                    <h6 class="mb-1 fs-6">Group Items</h6>
                                    <div class="input-group input-group-xxs mb-1">
                                        <input type="text" class="form-control form-control-xxs" id="${type}-item-input" placeholder="Add item...">
                                        <button class="btn btn-xxs btn-outline-primary d-flex align-items-center" type="button" id="${type}-add-item">
                                            <i class="bi bi-plus" style="font-size: 0.65rem;"></i>
                                        </button>
                                    </div>
                                    <div class="form-text small text-muted" style="font-size: 0.65rem; line-height: 1.1; margin-top: 0.15rem;">
                                        Add items or paste multiple below
                                    </div>
                                </div>
                                <div class="flex-grow-1" style="overflow: hidden; display: flex; flex-direction: column;">
                                    <div class="p-2 flex-grow-1" style="overflow-y: auto;" id="${type}-items-list">
                                        <!-- Items will be listed here -->
                                    </div>
                                </div>
                            </div>
                        </div>`;
        } else {
            modalContent += `
                        <div id="${type}-form-container"></div>`;
        }
        modalContent += `
                    </div>
                </div>
            </div>`;
        modal.innerHTML = modalContent;
        document.body.appendChild(modal);
    }
    return modal;
};
window.EntityMaterialUI.showEntityForm = function(context, entityId, showPresetDropdown = true) {
    const modal = this.getOrCreateModal('entity');
    let modalInstance = bootstrap.Modal.getInstance(modal);
    if (modalInstance) {
        modalInstance.dispose();
        document.removeEventListener('keydown', modalInstance._escKeyHandler);
    }
    modalInstance = new bootstrap.Modal(modal, {
        backdrop: 'static',
        keyboard: false,
        focus: true
    });
    modal._modalInstance = modalInstance;
    let escPressTime = 0;
    const onEscKey = function(e) {
        if (e.key === 'Escape' && modalInstance._isShown) {
            const now = Date.now();
            if (now - escPressTime < 1000) {
                document.removeEventListener('keydown', onEscKey);
                modalInstance.hide();
            } else {
                escPressTime = now;
                window.EntityMaterialUI.showNotification(
                    'Press ESC again to quit',
                    'notification'
                );
            }
        }
    };
    modalInstance._escKeyHandler = onEscKey;
    document.addEventListener('keydown', onEscKey);
    modal.addEventListener('hidden.bs.modal', function onHidden() {
        document.removeEventListener('keydown', onEscKey);
        modal.removeEventListener('hidden.bs.modal', onHidden);
    });
    const form = this.createEntityForm(showPresetDropdown);
    context.currentModal = modalInstance;
    let formContainer;
    const isGroupModal = modal.id.includes('-group');
    if (isGroupModal) {
        formContainer = modal.querySelector('#entity-form-container');
        if (!formContainer) {
            console.error('Entity group form container not found');
            return;
        }
    } else {
        const modalBody = modal.querySelector('.modal-body');
        if (!modalBody) {
            console.error('Modal body not found');
            return;
        }
        modalBody.innerHTML = '';
        formContainer = document.createElement('div');
        formContainer.id = 'entity-form-container';
        modalBody.appendChild(formContainer);
    }
    formContainer.innerHTML = '';
    formContainer.appendChild(form);
    const initializeCheckboxes = () => {
        form.querySelectorAll('[data-property$=".Enabled"]').forEach(checkbox => {
            if (!checkbox.hasAttribute('data-has-change-handler')) {
                checkbox.addEventListener('change', (e) => {
                    context.toggleInputsForCheckbox(e.target);
                });
                checkbox.setAttribute('data-has-change-handler', 'true');
            }
            context.toggleInputsForCheckbox(checkbox);
        });
    };
    initializeCheckboxes();
    setTimeout(initializeCheckboxes, 100);
    const numberInputs = form.querySelectorAll('input[type="number"]');
    numberInputs.forEach(input => {
        this.addNumberInputValidation(input);
        if (input.type === 'range') {
            const valueDisplay = document.getElementById(`${input.id}-value`);
            if (valueDisplay) {
                input.addEventListener('input', (e) => {
                    valueDisplay.textContent = e.target.value;
                });
            }
        }
        if (input.id.includes('red') || input.id.includes('green') || input.id.includes('blue')) {
            input.addEventListener('change', (e) => {
                let value = parseInt(e.target.value);
                if (isNaN(value)) value = 0;
                e.target.value = Math.min(255, Math.max(0, value));
            });
        }
    });
    const presetSelect = form.querySelector('#entity-preset');
    const nameInput = form.querySelector('#entity-name');
    if (presetSelect && nameInput) {
        presetSelect.addEventListener('change', function() {
            if (this.value) {
                nameInput.value = this.value;
            } else if (this.selectedIndex === this.options.length - 1) {
                nameInput.value = '';
                nameInput.focus();
            }
        });
        nameInput.addEventListener('input', function() {
            if (this.value) {
                presetSelect.selectedIndex = presetSelect.options.length - 1;
            } else {
                presetSelect.selectedIndex = 0;
            }
        });
    }
    form.onsubmit = (e) => {
        e.preventDefault();
        if (nameInput) {
            const normalized = window.autocompleteUtils.normalizeName(nameInput.value);
            if (normalized) {
                nameInput.value = normalized;
            }
        }
        if (!form.checkValidity()) {
            e.stopPropagation();
            form.classList.add('was-validated');
            return;
        }
        const name = context.capitalizeName(nameInput.value.trim());
        if (!name) {
            nameInput.focus();
            return;
        }
        const validation = window.EntityMaterialUI.validateName(context, name, 'entity', entityId);
        if (!validation.isValid) {
            console.warn(validation.message);
            window.EntityMaterialUI.showNameValidationModal(context, name, 'entity', entityId);
            nameInput.focus();
            nameInput.select();
            return;
        }
        if (entityId) {
            context.handleEntityFormSubmit(e, entityId);
        } else {
            const properties = {};
            form.querySelectorAll('[data-property]').forEach((input) => {
                const propName = input.dataset.property;
                if (input.type === 'checkbox') {
                    properties[propName] = input.checked;
                } else if (input.type === 'number') {
                    properties[propName] = parseFloat(input.value) || 0;
                } else {
                    properties[propName] = input.value;
                }
            });
            context.pendingEntity = {
                id: Date.now().toString(),
                name,
                properties
            };
            context.closeModal(form);
            window.EntityMaterialUI.showMaterialForm(context);
        }
    };
    if (entityId) {
        const entity = context.entities.find(e => e.id === entityId);
        if (entity) {
            form.querySelector('#entity-name').value = entity.name;
            if (entity.properties) {
                Object.entries(entity.properties).forEach(([key, value]) => {
                    const input = form.querySelector(`[data-property="${key}"]`);
                    if (input) {
                        if (input.type === 'checkbox') {
                            input.checked = Boolean(value);
                        } else if (input.type === 'range' || input.type === 'number') {
                            const numValue = parseFloat(value) || 0;
                            input.value = numValue.toFixed(1);
                            if (input.type === 'range' && input.nextElementSibling?.classList.contains('form-range-value')) {
                                input.nextElementSibling.textContent = input.value;
                            }
                        } else if (input.tagName === 'SELECT') {
                            input.value = value !== null && value !== undefined ? value : '';
                        } else {
                            input.value = value !== null && value !== undefined ? value : '';
                        }
                        if (input.type === 'range') {
                            const displayElement = document.getElementById(`${input.id}-value`);
                            if (displayElement) {
                                displayElement.textContent = input.value;
                            }
                        }
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                    } else {
                        console.warn(`Could not find input for property: ${key}`);
                    }
                });
            }
        }
    }
    modalInstance.show();
    window.dispatchEvent(new Event('resize'));
};
window.EntityMaterialUI.createMaterialForm = function(prefix = 'material-', showPresetDropdown = true) {
    const form = document.createElement('form');
    form.id = 'material-form';
    const commonBlocks = window.EntityProperties.getCommonBlocks();
    const materialOptions = Array.isArray(commonBlocks)
        ? commonBlocks
        : Object.keys(commonBlocks || {});
    const setupAutocomplete = () => {
        const materialNameInput = form.querySelector('#material-name');
        const materialPreset = form.querySelector('#material-preset');
        if (materialNameInput && materialPreset) {
            materialNameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    const currentValue = materialNameInput.value.trim().toUpperCase();
                    if (!currentValue) return;
                    const commonBlocks = window.EntityProperties?.getCommonBlocks?.() || [];
                    const matchingBlock = commonBlocks.find(block =>
                        block.toUpperCase().startsWith(currentValue)
                    );
                    if (matchingBlock) {
                        materialNameInput.value = matchingBlock;
                        materialNameInput.dispatchEvent(new Event('input', { bubbles: true }));
                        materialNameInput.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    return false;
                }
            });
            window.autocompleteUtils.setupMaterialNameInput(materialNameInput, materialPreset);
        }
    };
    setTimeout(setupAutocomplete, 0);
    let formHTML = `
        <div class="mb-3">
            <label for="material-name" class="form-label fw-bold">${showPresetDropdown ? 'Material Name' : 'Group Name'}</label>
            <div class="input-group">
                ${showPresetDropdown ? `
                    <select class="form-select" id="material-preset" aria-label="Select preset material">
                        <option value="" selected>-- Select Preset --</option>
                ` : ''}
                ${showPresetDropdown ? materialOptions.map(material =>
                    `<option value="${material}">${material}</option>`
                ).join('') : ''}
                ${showPresetDropdown ? `
                    <option value="">Custom</option>
                ` : ''}
                <input type="text" class="form-control" id="material-name" name="material-name" placeholder="${showPresetDropdown ? 'STONE, GRASS_BLOCK...' : 'Enter group name'}" required>
            </div>
            ${showPresetDropdown ? '<div class="form-text">Type a material name and press Enter to autocomplete Or type a custom <br> material name</div>' : ''}
        </div>
        <!-- Tab navigation -->
        <ul class="nav nav-tabs mb-3" id="${prefix}tabs" role="tablist">
            <li class="nav-item" role="presentation">
                <button class="nav-link active" id="${prefix}properties-tab" data-bs-toggle="tab" data-bs-target="#${prefix}properties" type="button" role="tab" aria-controls="${prefix}properties" aria-selected="true">Properties</button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="${prefix}particles-tab" data-bs-toggle="tab" data-bs-target="#${prefix}particles" type="button" role="tab" aria-controls="${prefix}particles" aria-selected="false" data-disabled="true">Particle Effects</button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="${prefix}sounds-tab" data-bs-toggle="tab" data-bs-target="#${prefix}sounds" type="button" role="tab" aria-controls="${prefix}sounds" aria-selected="false" data-disabled="true">Sound Effects</button>
            </li>
        </ul>
        <div class="tab-content" id="${prefix}tabsContent">
            <!-- Material Properties Tab -->
            <div class="tab-pane fade show active" id="${prefix}properties" role="tabpanel" aria-labelledby="${prefix}properties-tab">
                <div class="row g-3">
    `;
    const materialProperties = window.EntityProperties.getMaterialProperties();
    for (const [prop, config] of Object.entries(materialProperties)) {
        const inputId = `material-prop-${prop.toLowerCase().replace(/\./g, '-')}`;
        const isNumberInput = config.type === 'number';
        formHTML += `
            <div class="col-md-6">
                <div class="mb-3">
                    ${prop !== 'FancyUnderwaterDetection' ?
                        `<label for="${inputId}" class="form-label">${prop}</label>` :
                        '<div class="pt-4"></div>'}  <!-- Add padding when no label -->
        `;
        if (config.type === 'boolean') {
            const checked = config.default === 'true' ? 'checked' : '';
            formHTML += `
                <div class="form-check form-switch p-2 border rounded" style="user-select: none; -webkit-user-select: none;">
                    <div class="d-flex justify-content-between align-items-center">
                        <label class="form-check-label flex-grow-1" for="${inputId}" style="cursor: pointer; user-select: none; -webkit-user-select: none;">
                            ${prop}
                        </label>
                        <input class="form-check-input" type="checkbox"
                               id="${inputId}"
                               ${checked}
                               data-property="${prop}">
                    </div>
                </div>
            `;
        } else {
            formHTML += `
                <input type="${config.type}"
                       class="form-control"
                       id="${inputId}"
                       data-property="${prop}"
                       data-is-number="${isNumberInput}"
                       value="${config.default}"
                       ${config.placeholder ? `placeholder="${config.placeholder}"` : ''}
                       ${config.min !== undefined ? `min="${config.min}"` : ''}
                       ${config.max !== undefined ? `max="${config.max}"` : ''}
                       ${config.step !== undefined ? `step="${config.step}"` : ''}
                       ${config.required ? 'required' : ''}>
            `;
        }
        formHTML += `
                    ${config.description ? `<div class="form-text">${config.description}</div>` : ''}
                </div>
            </div>
        `;
    }
    formHTML += `
                </div>
            </div>
            <!-- Add Particle and Sound Tabs -->
            ${window.EntityMaterialUI.createParticlesTab(prefix)}
            ${window.EntityMaterialUI.createSoundsTab(prefix)}
            <!-- Submit button -->
            <div class="modal-footer mt-3">
                <button type="submit" class="btn btn-primary">Save Entity</button>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            </div>
        </div>
    `;
    form.innerHTML = formHTML;
    const particleNumberInputs = [
        `${prefix}particle-amount`, `${prefix}particle-speed`,
        `${prefix}particle-deltax`, `${prefix}particle-deltay`, `${prefix}particle-deltaz`,
        `${prefix}particle-red`, `${prefix}particle-green`, `${prefix}particle-blue`,
        `${prefix}particle-size`
    ];
    particleNumberInputs.forEach(inputId => {
        const input = form.querySelector(`#${inputId}`);
        if (input) {
            window.EntityMaterialUI.addNumberInputValidation(input);
            if (inputId.includes('red') || inputId.includes('green') || inputId.includes('blue')) {
                input.addEventListener('change', (e) => {
                    let value = parseInt(e.target.value);
                    if (isNaN(value)) value = 0;
                    e.target.value = Math.min(255, Math.max(0, value));
                });
            }
            if (inputId.includes('speed') || inputId.includes('delta') || inputId.includes('size')) {
                input.step = '0.1';
            }
        }
    });
    const initTabs = () => {
        const toggleInputs = (checkbox, selectorPrefix) => {
            if (!checkbox) return;
            const enabled = checkbox.checked;
            const container = checkbox.closest('.tab-pane') || document;
            const controls = container.querySelectorAll(
                `#${selectorPrefix} input:not([id$="-enabled"]), #${selectorPrefix} select`
            );
            controls.forEach(control => {
                control.disabled = !enabled;
                control.classList.toggle('disabled-input', !enabled);
                if (control.classList.contains('form-group') || control.classList.contains('input-group')) {
                    const children = control.querySelectorAll('input, select, button, textarea');
                    children.forEach(child => {
                        child.disabled = !enabled;
                        child.classList.toggle('disabled-input', !enabled);
                    });
                }
            });
            const card = checkbox.closest('.particle-card');
            if (card) {
                card.style.opacity = enabled ? '1' : '0.7';
            }
        };
        const setupToggle = (checkboxId, selectorPrefix) => {
            const checkbox = document.getElementById(checkboxId);
            if (!checkbox) return;
            toggleInputs(checkbox, selectorPrefix);
            checkbox.addEventListener('change', () => toggleInputs(checkbox, selectorPrefix));
        };
        setupToggle(`${prefix}sound-sound-enabled`, `${prefix}sounds`);
        setupToggle(`${prefix}particle-particles-enabled`, `${prefix}particles`);
    };
    setTimeout(initTabs, 0);
    return form;
}
window.EntityMaterialUI.showMaterialForm = function(context, materialId, skipModalCreation = false, showPresetDropdown = true) {
        if (skipModalCreation && context.currentModal) {
            context.currentModal.show();
            return;
        }
        const modal = window.EntityMaterialUI.getOrCreateModal('material');
        let formContainer;
        const isGroupModal = modal.id.includes('-group');
        if (isGroupModal) {
            formContainer = modal.querySelector('#material-form-container');
            if (!formContainer) {
                console.error('Material group form container not found');
                return;
            }
        } else {
            const modalBody = modal.querySelector('.modal-body');
            if (!modalBody) {
                console.error('Modal body not found');
                return;
            }
            modalBody.innerHTML = '';
            formContainer = document.createElement('div');
            formContainer.id = 'material-form-container';
            modalBody.appendChild(formContainer);
        }
        formContainer.innerHTML = '';
        const form = window.EntityMaterialUI.createMaterialForm();
        formContainer.appendChild(form);
        form.querySelectorAll('[data-property$=".Enabled"]').forEach(checkbox => {
            context.toggleInputsForCheckbox(checkbox);
        });
        const materialNumberInputs = form.querySelectorAll('input[data-is-number="true"]');
        materialNumberInputs.forEach(input => {
            window.EntityMaterialUI.addNumberInputValidation(input);
            input.addEventListener('change', (e) => {
                const min = parseFloat(e.target.min);
                const max = parseFloat(e.target.max);
                let value = parseFloat(e.target.value);
                if (!isNaN(min) && value < min) {
                    e.target.value = min;
                } else if (!isNaN(max) && value > max) {
                    e.target.value = max;
                }
            });
        });
        let modalInstance = bootstrap.Modal.getInstance(modal);
        if (modalInstance) {
            modalInstance.dispose();
            document.removeEventListener('keydown', modalInstance._escKeyHandler);
        }
        modalInstance = new bootstrap.Modal(modal, {
            backdrop: 'static',
            keyboard: false,
            focus: true
        });
        modal._modalInstance = modalInstance;
        let escPressTime = 0;
        const onEscKey = function(e) {
            if (e.key === 'Escape' && modalInstance._isShown) {
                const now = Date.now();
                if (now - escPressTime < 1000) {
                    document.removeEventListener('keydown', onEscKey);
                    modalInstance.hide();
                } else {
                    escPressTime = now;
                    window.EntityMaterialUI.showNotification(
                        'Press ESC again to quit',
                        'notification'
                    );
                }
            }
        };
        modalInstance._escKeyHandler = onEscKey;
        document.addEventListener('keydown', onEscKey);
        modal.addEventListener('hidden.bs.modal', function onHidden() {
            document.removeEventListener('keydown', onEscKey);
            modal.removeEventListener('hidden.bs.modal', onHidden);
        });
        context.currentModal = modalInstance;
        const nameInput = form.querySelector('#material-name');
        const presetSelect = form.querySelector('#material-preset');
        if (presetSelect && nameInput) {
            const onPresetChange = function() {
                if (this.value) {
                    nameInput.value = this.value;
                    setTimeout(() => {
                        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
                    }, 0);
                }
            };
            const { setupAutocomplete } = window.autocompleteUtils;
            const { getMaterialTypes } = window.ConfigProperties;
            setupAutocomplete(nameInput, presetSelect, getMaterialTypes(), {
                customText: '-- CUSTOM --',
                defaultText: '-- Select Preset --',
                enableTypeahead: true
            });
            presetSelect.addEventListener('change', onPresetChange);
        }
        form.onsubmit = (e) => {
            e.preventDefault();
            if (nameInput) {
                const normalized = window.autocompleteUtils.normalizeName(nameInput.value);
                if (normalized) {
                    nameInput.value = normalized;
                }
            }
            if (!form.checkValidity()) {
                e.stopPropagation();
                form.classList.add('was-validated');
                return;
            }
            context.handleMaterialFormSubmit(e, materialId);
        };
        if (materialId) {
            const material = context.materials.find(m => m.id === materialId);
            if (material) {
                if (nameInput) {
                    nameInput.value = material.name || '';
                    const materialName = material.name || '';
                    let foundMatch = false;
                    for (let i = 0; i < presetSelect.options.length; i++) {
                        if (presetSelect.options[i].value === materialName) {
                            presetSelect.value = materialName;
                            foundMatch = true;
                            break;
                        }
                    }
                    if (!foundMatch) {
                        presetSelect.value = '';
                    }
                }
                if (material.properties) {
                    Object.entries(material.properties).forEach(([key, value]) => {
                        const input = form.querySelector(`[data-property="${key}"]`);
                        if (input) {
                            if (input.type === 'checkbox') {
                                input.checked = Boolean(value);
                            } else if (input.type === 'range' || input.type === 'number') {
                                input.value = parseFloat(value) || 0;
                                if (input.type === 'range' && input.nextElementSibling?.classList.contains('form-range-value')) {
                                    input.nextElementSibling.textContent = input.value;
                                }
                            } else if (input.tagName === 'SELECT') {
                                input.value = value !== null && value !== undefined ? value : '';
                            } else {
                                input.value = value !== null && value !== undefined ? value : '';
                            }
                            if (input.type === 'range') {
                                const displayElement = document.getElementById(`${input.id}-value`);
                                if (displayElement) {
                                    displayElement.textContent = input.value;
                                }
                            }
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                        } else {
                            console.warn(`Could not find input for material property: ${key}`);
                        }
                    });
                }
            }
        }
        modalInstance.show();
    }
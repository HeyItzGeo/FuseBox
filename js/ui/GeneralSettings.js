class GeneralSettings {
    static resetHelper({
        storageKey = window.exportManager?.STORAGE_KEY,
        propertiesToRemove = [],
        instanceProperties = null
    } = {}) {
        if (!storageKey) return false;
        try {
            const data = localStorage.getItem(storageKey);
            if (!data) return false;
            const parsedData = JSON.parse(data);
            let shouldUpdate = false;
            propertiesToRemove.forEach(propId => {
                if (propId in parsedData) {
                    delete parsedData[propId];
                    shouldUpdate = true;
                }
            });
            if (shouldUpdate) {
                if (Object.keys(parsedData).length > 0) {
                    localStorage.setItem(storageKey, JSON.stringify(parsedData));
                } else {
                    localStorage.removeItem(storageKey);
                }
            }
            if (instanceProperties) {
                Object.assign(this, instanceProperties);
            }
            return shouldUpdate;
        } catch (e) {
            console.error('Error in resetHelper:', e);
            return false;
        }
    }
    constructor(properties) {
        this.properties = properties;
        this.filteredProperties = [
            'UseBlockDatabase',
            'CheckBlockDatabaseAtStartup',
            'BlockDurability',
            'EnableMetrics'
        ];
    }
    init(container) {
        if (!container) return;
        container.innerHTML = '';
        const card = document.createElement('div');
        card.className = 'card mb-4';
        const cardHeader = document.createElement('div');
        cardHeader.className = 'card-header d-flex justify-content-between align-items-center';
        const title = document.createElement('span');
        title.textContent = 'General Settings';
        const resetButton = document.createElement('button');
        resetButton.className = 'btn btn-sm btn-outline-danger';
        resetButton.innerHTML = '<i class="bi bi-arrow-counterclockwise"></i> Reset to Defaults';
        resetButton.addEventListener('click', () => this.resetToDefaults(container));
        cardHeader.appendChild(title);
        cardHeader.appendChild(resetButton);
        const cardBody = document.createElement('div');
        cardBody.className = 'card-body';
        const style = document.createElement('style');
        style.textContent = `
            #general-settings-container .card-body {
                font-size: 1.02rem;
            }
        `;
        document.head.appendChild(style);
        this.filteredProperties.forEach(propId => {
            const setting = this.properties[propId];
            if (setting) {
                const settingElement = this.createSettingElement(propId, setting);
                if (settingElement) {
                    cardBody.appendChild(settingElement);
                }
            }
        });
        const branding = document.createElement('div');
        branding.className = 'mt-4 pt-2 border-top text-end';
        branding.style.opacity = '0.6';
        branding.style.fontSize = '0.85rem';
        branding.setAttribute('data-branding', 'RlVTRUJPWCBieSBIZXlJdHpHZW8=');
        branding.textContent = atob('RlVTRUJPWCBieSBIZXlJdHpHZW8=');
        cardBody.appendChild(branding);
        card.appendChild(cardHeader);
        card.appendChild(cardBody);
        container.appendChild(card);
    }
    createSettingElement(id, setting) {
        const wrapper = document.createElement('div');
        wrapper.className = 'mb-3';
        const label = document.createElement('label');
        label.className = 'form-label';
        label.textContent = this.formatLabel(id);
        label.htmlFor = id;
        let inputElement;
        switch (setting.type) {
            case 'boolean':
                const formCheck = document.createElement('div');
                formCheck.className = 'form-check form-switch';
                inputElement = document.createElement('input');
                inputElement.className = 'form-check-input general-setting';
                inputElement.type = 'checkbox';
                inputElement.id = id;
                inputElement.dataset.path = id;
                inputElement.checked = setting.default === 'true';
                inputElement.addEventListener('change', () => {
                    if (window.exportManager) {
                        window.exportManager.saveToStorage();
                    }
                });
                formCheck.appendChild(inputElement);
                wrapper.appendChild(label);
                wrapper.appendChild(formCheck);
                break;
            case 'number':
                inputElement = document.createElement('input');
                inputElement.className = 'form-control general-setting';
                inputElement.type = 'number';
                inputElement.id = id;
                inputElement.dataset.path = id;
                inputElement.value = setting.default || '';
                inputElement.addEventListener('blur', () => {
                    if (window.exportManager) {
                        window.exportManager.saveToStorage();
                    }
                });
                if (setting.min) inputElement.min = setting.min;
                if (setting.step) inputElement.step = setting.step;
                if (setting.placeholder) inputElement.placeholder = setting.placeholder;
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
                inputElement.addEventListener('paste', (e) => {
                    const pasteData = e.clipboardData || window.clipboardData;
                    const pastedText = pasteData.getData('text');
                    if (!/^[0-9.-]+$/.test(pastedText)) {
                        e.preventDefault();
                    }
                });
                wrapper.appendChild(label);
                wrapper.appendChild(inputElement);
                break;
            default:
                return null;
        }
        if (setting.description) {
            const helpText = document.createElement('div');
            helpText.className = 'form-text';
            helpText.textContent = setting.description;
            wrapper.appendChild(helpText);
        }
        return wrapper;
    }
    resetToDefaults(container) {
        GeneralSettings.resetHelper({
            propertiesToRemove: this.filteredProperties,
            instanceProperties: {
            }
        });
        if (container) this.init(container);
    }
    formatLabel(str) {
        return str
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, match => match.toUpperCase())
            .trim();
    }
}
class ChecktoolSettings {
    constructor(properties) {
        this.properties = properties;
        this.filteredProperties = [
            'Checktool.AlwaysEnabled',
            'Checktool.EnabledByDefault',
            'Checktool.PreventActionWhenCheckingHandledBlocks',
            'Checktool.PreventActionWhenCheckingNonHandledBlocks',
            'Checktool.SilentWhenCheckingOnDisabledWorlds',
            'Checktool.SilentWhenCheckingWithoutPermissions',
            'Checktool.SilentWhenCheckingNonHandledBlocks',
            'Checktool.SilentWhenCheckingHandledBlocks',
            'Checktool.ShowBossBar',
            'Checktool.BossBarColor',
            'Checktool.BossBarStyle',
            'Checktool.BossBarDuration'
        ].filter(prop => this.properties[prop] !== undefined);
    }
    init(container) {
        if (!container) return;
        container.innerHTML = '';
        const card = document.createElement('div');
        card.className = 'card mb-4';
        const cardHeader = document.createElement('div');
        cardHeader.className = 'card-header d-flex justify-content-between align-items-center';
        const title = document.createElement('span');
        title.textContent = 'Checktool Settings';
        cardHeader.appendChild(title);
        const resetButton = document.createElement('button');
        resetButton.className = 'btn btn-sm btn-outline-danger';
        resetButton.innerHTML = '<i class="bi bi-arrow-counterclockwise"></i> Reset to Defaults';
        resetButton.addEventListener('click', () => this.resetToDefaults(container));
        cardHeader.appendChild(resetButton);
        const cardBody = document.createElement('div');
        cardBody.className = 'card-body';
        const row = document.createElement('div');
        row.className = 'row g-2';
        const style = document.createElement('style');
        style.textContent = `
            .tighter-columns {
                padding-left: 8px;
                padding-right: 8px;
            }
            #checktool-settings-container .card-body {
                font-size: 1.02rem;
            }
        `;
        document.head.appendChild(style);
        const leftCol = document.createElement('div');
        leftCol.className = 'col-md-6 tighter-columns';
        const rightCol = document.createElement('div');
        rightCol.className = 'col-md-6 tighter-columns';
        const half = Math.ceil(this.filteredProperties.length / 2);
        const leftProperties = this.filteredProperties.slice(0, half);
        const rightProperties = this.filteredProperties.slice(half);
        leftProperties.forEach(propId => {
            const setting = this.getNestedProperty(propId);
            if (setting) {
                const settingElement = this.createSettingElement(propId, setting);
                if (settingElement) {
                    leftCol.appendChild(settingElement);
                }
            }
        });
        rightProperties.forEach(propId => {
            const setting = this.getNestedProperty(propId);
            if (setting) {
                const settingElement = this.createSettingElement(propId, setting);
                if (settingElement) {
                    rightCol.appendChild(settingElement);
                }
            }
        });
        row.appendChild(leftCol);
        row.appendChild(rightCol);
        cardBody.appendChild(row);
        const branding = document.createElement('div');
        branding.className = 'mt-4 pt-2 border-top text-end';
        branding.style.opacity = '0.6';
        branding.style.fontSize = '0.85rem';
        branding.setAttribute('data-branding', 'RlVTRUJPWCBieSBIZXlJdHpHZW8=');
        branding.textContent = atob('RlVTRUJPWCBieSBIZXlJdHpHZW8=');
        cardBody.appendChild(branding);
        card.appendChild(cardHeader);
        card.appendChild(cardBody);
        container.appendChild(card);
    }
    getNestedProperty(path) {
        if (this.properties[path] !== undefined) {
            return this.properties[path];
        }
        try {
            return path.split('.').reduce((obj, key) => {
                return (obj && obj[key] !== undefined) ? obj[key] : null;
            }, this.properties);
        } catch (error) {
            return null;
        }
    }
    createSettingElement(id, setting) {
        const wrapper = document.createElement('div');
        wrapper.className = 'mb-3';
        const label = document.createElement('label');
        label.className = 'form-label';
        label.textContent = this.formatLabel(id.split('.').pop());
        label.htmlFor = id;
        let inputElement;
        switch (setting.type) {
            case 'boolean':
                const formCheck = document.createElement('div');
                formCheck.className = 'form-check form-switch';
                inputElement = document.createElement('input');
                inputElement.className = 'form-check-input general-setting';
                inputElement.type = 'checkbox';
                inputElement.id = id;
                inputElement.dataset.path = id;
                inputElement.checked = setting.default === 'true';
                inputElement.addEventListener('change', () => {
                    if (window.exportManager) {
                        window.exportManager.saveToStorage();
                    }
                });
                formCheck.appendChild(inputElement);
                wrapper.appendChild(label);
                wrapper.appendChild(formCheck);
                break;
            case 'number':
                if (id.endsWith('Duration')) {
                    const inputGroup = document.createElement('div');
                    inputGroup.className = 'input-group';
                    inputElement = document.createElement('input');
                    inputElement.className = 'form-control checktool-setting';
                    inputElement.type = 'number';
                    inputElement.id = id;
                    inputElement.dataset.path = id;
                    inputElement.value = setting.default || '';
                    inputElement.addEventListener('blur', () => {
                        if (window.exportManager) {
                            window.exportManager.saveToStorage();
                        }
                    });
                    if (setting.min) inputElement.min = setting.min;
                    if (setting.max) inputElement.max = setting.max;
                    if (setting.step) inputElement.step = setting.step;
                    if (setting.placeholder) inputElement.placeholder = setting.placeholder;
                    inputElement.addEventListener('keydown', (e) => {
                        if ([8, 9, 27, 13, 110].includes(e.keyCode) ||
                            (e.ctrlKey && [65, 67, 86, 88].includes(e.keyCode)) ||
                            (e.keyCode >= 35 && e.keyCode <= 40)) {
                            return;
                        }
                        if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) &&
                            (e.keyCode < 96 || e.keyCode > 105)) {
                            e.preventDefault();
                        }
                    });
                    inputElement.addEventListener('paste', (e) => {
                        const pasteData = e.clipboardData || window.clipboardData;
                        const pastedText = pasteData.getData('text');
                        if (!/^[0-9]+$/.test(pastedText)) {
                            e.preventDefault();
                        }
                    });
                    const suffix = document.createElement('span');
                    suffix.className = 'input-group-text';
                    suffix.textContent = 'ms';
                    inputGroup.appendChild(inputElement);
                    inputGroup.appendChild(suffix);
                    wrapper.appendChild(label);
                    wrapper.appendChild(inputGroup);
                } else {
                    inputElement = document.createElement('input');
                    inputElement.className = 'form-control checktool-setting';
                    inputElement.type = 'number';
                    inputElement.id = id;
                    inputElement.dataset.path = id;
                    inputElement.value = setting.default || '';
                    inputElement.addEventListener('blur', () => {
                        if (window.exportManager) {
                            window.exportManager.saveToStorage();
                        }
                    });
                    if (setting.min) inputElement.min = setting.min;
                    if (setting.max) inputElement.max = setting.max;
                    if (setting.step) inputElement.step = setting.step;
                    if (setting.placeholder) inputElement.placeholder = setting.placeholder;
                    wrapper.appendChild(label);
                    wrapper.appendChild(inputElement);
                }
                break;
            case 'select':
                inputElement = document.createElement('select');
                inputElement.className = 'form-select form-select-sm checktool-setting';
                inputElement.id = id;
                inputElement.dataset.path = id;
                inputElement.addEventListener('change', (e) => {
                    if (window.exportManager) {
                        window.exportManager.saveToStorage();
                    }
                });
                if (setting.options && Array.isArray(setting.options)) {
                    setting.options.forEach(option => {
                        const optionElement = document.createElement('option');
                        optionElement.value = option.value;
                        optionElement.textContent = option.label || option.value;
                        if (option.value === setting.default) {
                            optionElement.selected = true;
                        }
                        inputElement.appendChild(optionElement);
                    });
                }
                wrapper.appendChild(label);
                wrapper.appendChild(inputElement);
                break;
            case 'text':
                if (id.endsWith('Duration')) {
                    const inputGroup = document.createElement('div');
                    inputGroup.className = 'input-group';
                    inputElement = document.createElement('input');
                    inputElement.className = 'form-control checktool-setting';
                    inputElement.type = 'number';
                    inputElement.id = id;
                    inputElement.dataset.path = id;
                    inputElement.addEventListener('blur', () => {
                        if (window.exportManager) {
                            window.exportManager.saveToStorage();
                        }
                    });
                    const defaultValue = (setting.default || '').replace('ms', '').trim();
                    inputElement.value = defaultValue;
                    if (setting.placeholder) inputElement.placeholder = setting.placeholder;
                    const suffix = document.createElement('span');
                    suffix.className = 'input-group-text';
                    suffix.textContent = 'ms';
                    inputElement.addEventListener('change', () => {
                        const value = inputElement.value.trim();
                        if (value !== '') {
                            inputElement.value = value;
                        }
                    });
                    inputGroup.appendChild(inputElement);
                    inputGroup.appendChild(suffix);
                    wrapper.appendChild(label);
                    wrapper.appendChild(inputGroup);
                } else {
                    inputElement = document.createElement('input');
                    inputElement.className = 'form-control checktool-setting';
                    inputElement.type = 'text';
                    inputElement.id = id;
                    inputElement.dataset.path = id;
                    inputElement.value = setting.default || '';
                    inputElement.addEventListener('blur', () => {
                        if (window.exportManager) {
                            window.exportManager.saveToStorage();
                        }
                    });
                    if (setting.placeholder) inputElement.placeholder = setting.placeholder;
                    wrapper.appendChild(label);
                    wrapper.appendChild(inputElement);
                }
                break;
            default:
                return null;
        }
        if (setting.description) {
            const helpText = document.createElement('div');
            helpText.className = 'form-text';
            helpText.textContent = setting.description;
            wrapper.appendChild(helpText);
        }
        return wrapper;
    }
    resetToDefaults(container) {
        GeneralSettings.resetHelper({
            propertiesToRemove: ['checktoolSettings'],
            instanceProperties: {
            }
        });
        if (container) this.init(container);
    }
    formatLabel(str) {
        return str
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, match => match.toUpperCase())
            .trim();
    }
}
class LocalizationSettings {
    constructor(properties) {
        this.storageKey = 'fuseBox_localization';
        this.savedSettings = this.loadSettings();
        this.properties = this.savedSettings.locale || (properties ? properties.locale || {} : {});
        this.localePrefix = this.savedSettings.localePrefix || (properties ? properties.localePrefix : "[ExplodeAny] ");
        this.defaultMessages = {
            NotAllowed: "You are not allowed to perform this action!",
            Usage: "Usage: %DESCRIPTION%",
            OnlyPlayerAllowed: "Only players can perform this action!",
            PlayerDoesntExist: "Player %NAME% doesn't exist in the server!",
            PlayerIsOffline: "Player %NAME% must be online to perform that",
            EnterChecktoolMode: "You can now right-click a block with %PRETTY_ITEM% to display block durability",
            LeaveChecktoolMode: "You can no longer check for a block durability",
            ChecktoolToggledOn: "Checktool mode toggled on for player %NAME%",
            ChecktoolToggledOff: "Checktool mode toggled off for player %NAME%",
            ChecktoolUse: "Block health: %DURABILITY_PERCENTAGE%% (%PRETTY_MATERIAL%)",
            ChecktoolUseBossBar: "%PRETTY_MATERIAL%: %DURABILITY_PERCENTAGE%%",
            ChecktoolSet: "Checktool successfully set to %PRETTY_ITEM%!",
            ChecktoolNotPersisted: "Checktool item was set to %PRETTY_ITEM%, but it couldn't be persisted",
            ChecktoolGiven: "A checktool (%PRETTY_ITEM%) was given to player %NAME%",
            ChecktoolReset: "Checktool successfully reset to bare hand (Air)",
            ChecktoolNotHandled: "%PRETTY_MATERIAL% is not handled by the current configuration",
            ChecktoolInfo: "Current checktool item: %PRETTY_ITEM%",
            ChecktoolAlwaysEnabled: "Checktool can't be toggled off because it's always enabled",
            DisabledInThisWorld: "This functionality is disabled in this world",
            Reloaded: "Reloaded successfully!",
            DebugEnabled: "Debug mode has been enabled",
            DebugDisabled: "Debug mode has been disabled"
        };
    }
    init(container) {
        if (!container) return;
        container.innerHTML = '';
        const localizationCard = document.createElement('div');
        localizationCard.className = 'card mb-4';
        const cardHeader = document.createElement('div');
        cardHeader.className = 'card-header';
        cardHeader.textContent = 'Localization Settings';
        const cardBody = document.createElement('div');
        cardBody.className = 'card-body';
        const description = document.createElement('p');
        description.className = 'text-muted small mb-3';
        description.textContent = 'Customize all plugin messages. Hover over the (i) icon for details about each message.';
        cardBody.appendChild(description);
        const gridContainer = document.createElement('div');
        gridContainer.className = 'row row-cols-1 row-cols-md-2 row-cols-lg-3 row-cols-xl-4 g-3';
        const localizationConfig = window.ConfigProperties.getLocalizationMessages();
        const allMessages = this.defaultMessages;
        Object.entries(allMessages).forEach(([key, defaultValue]) => {
            const messageConfig = localizationConfig[key] || {};
            const placeholders = messageConfig.placeholders || [];
            const description = messageConfig.description || 'No description available';
            const messageGroup = document.createElement('div');
            messageGroup.className = 'col';
            const card = document.createElement('div');
            card.className = 'card h-100';
            const cardBodyInner = document.createElement('div');
            cardBodyInner.className = 'card-body p-3';
            const header = document.createElement('div');
            header.className = 'd-flex justify-content-between align-items-center mb-2';
            const label = document.createElement('label');
            label.className = 'form-label small fw-bold mb-0';
            label.textContent = this.formatLabel(key);
            label.htmlFor = `locale_${key}`;
            label.title = `Default: "${defaultValue}"`;
            const infoButton = document.createElement('button');
            infoButton.type = 'button';
            infoButton.className = 'btn btn-sm btn-outline-info p-0 ms-2';
            infoButton.style.width = '20px';
            infoButton.style.height = '20px';
            infoButton.style.fontSize = '10px';
            infoButton.style.lineHeight = '1';
            infoButton.innerHTML = 'i';
            infoButton.setAttribute('data-bs-toggle', 'tooltip');
            infoButton.setAttribute('data-bs-placement', 'top');
            infoButton.setAttribute('data-bs-html', 'true');
            infoButton.title = `
                <div class='text-start'>
                    <div class='fw-bold mb-1'>${this.formatLabel(key)}</div>
                    <div class='small'>${description}</div>
                    ${placeholders.length > 0 ?
                        `<div class='mt-2'><span class='fw-bold'>Placeholders:</span><br>${placeholders.join(', ')}</div>` :
                        ''
                    }
                </div>
            `;
            new bootstrap.Tooltip(infoButton);
            header.appendChild(label);
            header.appendChild(infoButton);
            const textarea = document.createElement('textarea');
            textarea.className = 'form-control form-control-sm small w-100';
            textarea.rows = 4;
            textarea.style.minHeight = '100px';
            textarea.style.maxHeight = '300px';
            textarea.style.overflowY = 'auto';
            textarea.style.resize = 'vertical';
            textarea.style.fontSize = '0.9rem';
            textarea.style.lineHeight = '1.4';
            textarea.dataset.path = `locale.${key}`;
            textarea.placeholder = defaultValue;
            textarea.value = this.properties[key] || this.savedSettings[`locale.${key}`] || defaultValue;
            textarea.dataset.defaultValue = defaultValue;
            textarea.addEventListener('blur', (e) => this.saveSetting(`locale.${key}`, e.target.value));
            const placeholderContainer = document.createElement('div');
            placeholderContainer.className = 'mt-2 d-flex flex-wrap gap-1';
            if (placeholders.length > 0) {
                placeholders.forEach(placeholder => {
                    const chip = document.createElement('span');
                    chip.className = 'badge bg-secondary me-1 mb-1';
                    chip.style.cursor = 'pointer';
                    chip.style.fontSize = '0.7rem';
                    chip.textContent = placeholder;
                    chip.title = 'Click to insert placeholder';
                    chip.addEventListener('click', () => {
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const text = textarea.value;
                        textarea.value = text.substring(0, start) + placeholder + text.substring(end);
                        textarea.focus();
                        textarea.selectionStart = textarea.selectionEnd = start + placeholder.length;
                    });
                    placeholderContainer.appendChild(chip);
                });
            }
            cardBodyInner.appendChild(header);
            cardBodyInner.appendChild(textarea);
            cardBodyInner.appendChild(placeholderContainer);
            card.appendChild(cardBodyInner);
            messageGroup.appendChild(card);
            gridContainer.appendChild(messageGroup);
        });
        const prefixContainer = document.createElement('div');
        prefixContainer.className = 'mb-3 w-100';
        const prefixRow = document.createElement('div');
        prefixRow.className = 'row align-items-center';
        const prefixCol = document.createElement('div');
        prefixCol.className = 'col-md-6';
        const prefixSection = document.createElement('div');
        prefixSection.className = 'd-flex align-items-center gap-2';
        const prefixLabel = document.createElement('label');
        prefixLabel.className = 'form-label mb-0 small';
        prefixLabel.textContent = 'Message Prefix';
        prefixLabel.htmlFor = 'localePrefix';
        const prefixInput = document.createElement('input');
        prefixInput.type = 'text';
        prefixInput.className = 'form-control form-control-sm';
        prefixInput.id = 'localePrefix';
        prefixInput.style.width = '200px';
        prefixInput.value = this.savedSettings.localePrefix || this.localePrefix || '[ExplodeAny] ';
        prefixInput.placeholder = 'e.g. [ExplodeAny]';
        prefixInput.addEventListener('change', (e) => {
            const newValue = e.target.value;
            this.localePrefix = newValue;
            this.saveSetting('localePrefix', newValue);
        });
        const infoButton = document.createElement('button');
        infoButton.type = 'button';
        infoButton.className = 'btn btn-sm btn-outline-info p-0 ms-1';
        infoButton.style.width = '18px';
        infoButton.style.height = '18px';
        infoButton.style.fontSize = '10px';
        infoButton.style.lineHeight = '1';
        infoButton.innerHTML = 'i';
        infoButton.setAttribute('data-bs-toggle', 'tooltip');
        infoButton.setAttribute('data-bs-placement', 'top');
        const prefixConfig = window.ConfigProperties?.getLocalizationMessages?.()?.['LocalePrefix'];
        infoButton.title = prefixConfig?.description || 'Message prefix configuration';
        new bootstrap.Tooltip(infoButton);
        prefixSection.appendChild(prefixLabel);
        prefixSection.appendChild(prefixInput);
        prefixSection.appendChild(infoButton);
        prefixCol.appendChild(prefixSection);
        prefixRow.appendChild(prefixCol);
        const buttonCol = document.createElement('div');
        buttonCol.className = 'col-md-6 text-md-end';
        const resetButton = document.createElement('button');
        resetButton.className = 'btn btn-sm btn-outline-danger';
        resetButton.innerHTML = '<i class="bi bi-arrow-counterclockwise"></i> Reset to Defaults';
        resetButton.addEventListener('click', () => this.resetToDefaults(container));
        buttonCol.appendChild(resetButton);
        prefixRow.appendChild(buttonCol);
        prefixContainer.appendChild(prefixRow);
        cardBody.appendChild(prefixContainer);
        cardBody.appendChild(gridContainer);
        const branding = document.createElement('div');
        branding.className = 'mt-4 pt-2 border-top text-end';
        branding.style.opacity = '0.6';
        branding.style.fontSize = '0.85rem';
        branding.setAttribute('data-branding', 'RlVTRUJPWCBieSBIZXlJdHpHZW8=');
        branding.textContent = atob('RlVTRUJPWCBieSBIZXlJdHpHZW8=');
        cardBody.appendChild(branding);
        localizationCard.appendChild(cardHeader);
        localizationCard.appendChild(cardBody);
        container.appendChild(localizationCard);
    }
    formatLabel(str) {
        return str
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, match => match.toUpperCase())
            .trim();
    }
    saveSetting(key, value) {
        const settings = this.loadSettings();
        if (key === 'localePrefix') {
            settings.localePrefix = value;
            this.localePrefix = value;
        }
        else if (key.startsWith('locale.')) {
            const messageKey = key.split('.')[1];
            if (!settings.locale) settings.locale = {};
            settings.locale[messageKey] = value;
            this.properties[messageKey] = value;
        }
        localStorage.setItem(this.storageKey, JSON.stringify(settings));
    }
    loadSettings() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            console.error('Error loading settings:', e);
            return {};
        }
    }
    resetToDefaults(container) {
        this.properties = {};
        this.localePrefix = "[ExplodeAny] ";
        this.savedSettings = {};
        GeneralSettings.resetHelper({
            storageKey: this.storageKey,
            propertiesToRemove: ['locale', 'localePrefix'],
            instanceProperties: this
        });
        if (container) {
            const parent = container.parentNode;
            const tabId = container.id;
            container.remove();
            const newContainer = document.createElement('div');
            newContainer.id = tabId;
            parent.appendChild(newContainer);
            this.init(newContainer);
        }
    }
    getValues() {
        const values = {};
        Object.keys(this.defaultMessages).forEach(key => {
            const el = document.querySelector(`[data-path="locale.${key}"]`);
            values[key] = el ? el.value : this.properties[key] || this.defaultMessages[key];
        });
        const prefixEl = document.getElementById('localePrefix');
        return {
            localePrefix: prefixEl ? prefixEl.value : this.localePrefix,
            locale: values
        };
    }
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        GeneralSettings,
        ChecktoolSettings,
        LocalizationSettings
    };
} else {
    window.GeneralSettings = GeneralSettings;
    window.ChecktoolSettings = ChecktoolSettings;
    window.LocalizationSettings = LocalizationSettings;
}
if (!window.autocompleteUtils) {
    window.autocompleteUtils = {};
}
window.autocompleteUtils.normalizeName = function(name) {
    if (!name) return '';
    return name.trim().replace(/\s+/g, '_').toUpperCase();
};
function normalizeForComparison(str) {
    return String(str).toLowerCase().replace(/_/g, ' ').trim();
}
function handleTypeaheadSuggestion(inputElement, presetSelect, inputValue, trimmedValue) {
    if (!trimmedValue) {
        presetSelect.value = '';
        return false;
    }
    if (trimmedValue.length <= 1) {
        presetSelect.value = '';
        return false;
    }
    const normalizedInput = normalizeForComparison(trimmedValue);
    const optionsArray = Array.isArray(presetSelect.originalOptions)
        ? presetSelect.originalOptions
        : [];
    const matchingOptions = optionsArray
        .filter(option => {
            if (!option || !option.value) return false;
            const normalizedOption = normalizeForComparison(option.value);
            return normalizedOption.startsWith(normalizedInput);
        })
        .sort((a, b) => a.value.length - b.value.length);
    const closestMatch = matchingOptions[0];
    if (!closestMatch || normalizeForComparison(closestMatch.value) === normalizedInput) {
        presetSelect.value = closestMatch ? closestMatch.value : '';
        return false;
    }
    const isAtEnd = inputElement.selectionStart === inputElement.value.length;
    if (closestMatch && isAtEnd) {
        const currentValue = inputElement.value;
        const optionValue = String(closestMatch.value);
        const newValue = inputValue + optionValue.substring(inputValue.length);
        if (newValue !== currentValue) {
            inputElement.value = newValue;
            inputElement.setSelectionRange(inputValue.length, newValue.length);
            return true;
        }
    } else {
        presetSelect.value = '';
    }
    inputElement._lastValue = inputElement.value;
    return false;
}
window.autocompleteUtils.setupAutocomplete = function(inputElement, presetSelect, options, config = {}) {
    const {
        customText = '-- CUSTOM --',
        defaultText = '-- Select Preset --',
        enableTypeahead = true
    } = config;
    if (!presetSelect.originalOptions) {
        presetSelect.originalOptions = Array.from(presetSelect.options).map(opt => ({
            value: opt.value,
            text: opt.textContent,
            disabled: opt.disabled
        }));
    }
    if (presetSelect.options.length <= 1) {
        const fragment = document.createDocumentFragment();
        fragment.appendChild(new Option(defaultText, ''));
        options.forEach(option => fragment.appendChild(new Option(option, option)));
        fragment.appendChild(new Option(customText, ''));
        presetSelect.innerHTML = '';
        presetSelect.appendChild(fragment);
    }
    function updatePresetSelect(value) {
        const normalizedInput = normalizeForComparison(value);
        if (!normalizedInput) {
            presetSelect.value = '';
            return;
        }
        const optionsArray = Array.isArray(options) ? options : Object.values(options || {});
        const matches = optionsArray.filter(option => {
            const normalizedOption = normalizeForComparison(option);
            return normalizedOption.startsWith(normalizedInput);
        });
        const customOption = presetSelect.querySelector('option[value=""]:last-child');
        if (customOption) customOption.textContent = matches.length > 0 ? defaultText : customText;
        presetSelect.value = matches.length > 0 ? matches[0] : '';
    }
    let suppressTypeahead = false;
    const onKeyDown = (e) => {
        inputElement._lastKey = e.key;
        if ([9, 27, 37, 38, 39, 40].includes(e.keyCode)) return;
        const { selectionStart, selectionEnd, value } = inputElement;
        const isFullSelection = selectionStart === 0 && selectionEnd === value.length && value.length > 0;
        if ((e.key === 'Backspace' || e.key === 'Delete') && isFullSelection) {
            e.preventDefault();
            inputElement.value = '';
            presetSelect.value = '';
            inputElement.dispatchEvent(new Event('input', { bubbles: true }));
            return;
        }
        if (e.key === 'Backspace' && selectionStart !== selectionEnd && selectionEnd === value.length) {
            e.preventDefault();
            inputElement.value = value.slice(0, selectionStart - 1);
            inputElement.setSelectionRange(inputElement.value.length, inputElement.value.length);
            presetSelect.value = '';
            inputElement.dispatchEvent(new Event('input', { bubbles: true }));
            return;
        }
        if (e.keyCode === 8 || e.keyCode === 46) {
            suppressTypeahead = true;
            setTimeout(() => {
                if (!inputElement.value) presetSelect.value = '';
                suppressTypeahead = false;
            }, 0);
            return;
        }
    };
    const onInput = () => {
        const inputValue = inputElement.value;
        updatePresetSelect(inputValue);
        if (enableTypeahead && !suppressTypeahead) {
            handleTypeaheadSuggestion(inputElement, presetSelect, inputValue, inputValue);
        }
    };
    const onPresetChange = () => {
        if (presetSelect.value) {
            inputElement.value = presetSelect.value;
            setTimeout(() => inputElement.dispatchEvent(new Event('input', { bubbles: true })), 0);
        }
    };
    const onSelectionChange = () => {
        if (document.activeElement !== inputElement) return;
        const { selectionStart, selectionEnd, value } = inputElement;
        if (!value) return;
    };
    inputElement.addEventListener('input', onInput);
    inputElement.addEventListener('keydown', onKeyDown);
    presetSelect.addEventListener('change', onPresetChange);
    document.addEventListener('selectionchange', onSelectionChange);
    return () => {
        inputElement.removeEventListener('input', onInput);
        inputElement.removeEventListener('keydown', onKeyDown);
        presetSelect.removeEventListener('change', onPresetChange);
        document.removeEventListener('selectionchange', onSelectionChange);
    };
};
window.autocompleteUtils.createPresetSelect = function(options, config = {}) {
    const { defaultText = '-- Select Preset --' } = config;
    const select = document.createElement('select');
    select.className = 'preset-select';
    select.appendChild(new Option(defaultText, ''));
    options.forEach(option => select.appendChild(new Option(option, option)));
    return select;
};
window.autocompleteUtils.setupEntityNameInput = function(inputElement, presetSelect = null) {
    if (!inputElement) return;
    if (presetSelect) {
        if (!presetSelect.originalOptions) {
            presetSelect.originalOptions = Array.from(presetSelect.options).map(opt => ({
                value: opt.value,
                text: opt.textContent,
                disabled: opt.disabled
            }));
        }
        inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (presetSelect.value) {
                    inputElement.value = presetSelect.value.toUpperCase();
                    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        });
    }
    if (!inputElement._autocompleteInitialized) {
        const { setupAutocomplete } = window.autocompleteUtils;
        const { getAllEntityTypes } = window.ConfigProperties;
        const entityTypes = getAllEntityTypes();
        if (presetSelect) {
            setupAutocomplete(inputElement, presetSelect, entityTypes, {
                customText: '-- CUSTOM --',
                defaultText: '-- Select Preset --',
                enableTypeahead: true
            });
        } else {
            const hiddenSelect = document.createElement('select');
            hiddenSelect.style.display = 'none';
            document.body.appendChild(hiddenSelect);
            entityTypes.forEach(entity => {
                const opt = document.createElement('option');
                opt.value = entity;
                opt.textContent = entity;
                hiddenSelect.appendChild(opt);
            });
            setupAutocomplete(inputElement, hiddenSelect, entityTypes, {
                enableTypeahead: true
            });
            inputElement.addEventListener('blur', () => {
                if (document.body.contains(hiddenSelect)) {
                    document.body.removeChild(hiddenSelect);
                }
            });
        }
        inputElement._autocompleteInitialized = true;
    }
};
window.autocompleteUtils.setupMaterialNameInput = function(inputElement, presetSelect = null) {
    if (!inputElement) return;
    if (presetSelect && !presetSelect.originalOptions) {
        presetSelect.originalOptions = Array.from(presetSelect.options).map(opt => ({
            value: opt.value,
            text: opt.textContent,
            disabled: opt.disabled
        }));
    }
    if (!inputElement._autocompleteInitialized) {
        const { setupAutocomplete } = window.autocompleteUtils;
        const commonBlocks = window.EntityProperties.getCommonBlocks();
        const materialOptions = Array.isArray(commonBlocks)
            ? commonBlocks
            : Object.keys(commonBlocks || {});
        if (presetSelect) {
            setupAutocomplete(inputElement, presetSelect, materialOptions, {
                customText: '-- CUSTOM --',
                defaultText: '-- Select Preset --',
                enableTypeahead: true
            });
        } else {
            const hiddenSelect = document.createElement('select');
            hiddenSelect.style.display = 'none';
            document.body.appendChild(hiddenSelect);
            materialOptions.forEach(option => {
                const opt = document.createElement('option');
                opt.value = option;
                opt.textContent = option;
                hiddenSelect.appendChild(opt);
            });
            setupAutocomplete(inputElement, hiddenSelect, materialOptions, {
                enableTypeahead: true
            });
            inputElement.addEventListener('blur', () => {
                if (document.body.contains(hiddenSelect)) {
                    document.body.removeChild(hiddenSelect);
                }
            });
        }
        inputElement._autocompleteInitialized = true;
    }
};
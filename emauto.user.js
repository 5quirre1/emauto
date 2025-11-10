// ==UserScript==
// @name         emauto
// @namespace    http://tampermonkey.net/
// @version      1.0
// @author       @squirrel
// @description  add a emote dropdown stuff!!
// @match        https://pikidiary.lol/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let emotesCache = null;
    let emotesLoaded = false;

    async function loadEmotes() {
        if (emotesLoaded) return emotesCache;

        try {
            const response = await fetch('https://raw.githubusercontent.com/5quirre1/moaremotes-ext-fix/refs/heads/patch-3/emotes.json');
            const data = await response.json();

            emotesCache = data.slice(1).map(item => {
                const url = item[0];
                const filename = url.split('/').pop();
                const name = filename.replace(/\.(png|gif|jpg|jpeg|webp)$/i, '');
                return { name, url };
            });

            emotesLoaded = true;
            return emotesCache;
        } catch (error) {
            console.error('Failed to load emotes:', error);
            return [];
        }
    }

    loadEmotes();

    function setupEmoteAutocomplete(textarea) {
        let dropdown = null;

        textarea.addEventListener('input', async () => {
            const cursorPos = textarea.selectionStart;
            const textBeforeCursor = textarea.value.substring(0, cursorPos);
            const emoteMatch = textBeforeCursor.match(/:([^:\s]*)$/);
            const hasClosingColon = emoteMatch && textBeforeCursor.endsWith(':') && emoteMatch[1].length > 0;

            if (emoteMatch && !hasClosingColon) {
                const query = emoteMatch[1].toLowerCase();
                const emotes = await loadEmotes();
                const filteredEmotes = emotes
                    .filter(emote => emote.name.toLowerCase().includes(query))
                    .slice(0, 10);

                if (filteredEmotes.length > 0) {
                    const coords = getCaretCoordinates(textarea);
                    dropdown = createOrUpdateEmoteDropdown(textarea, filteredEmotes, coords, dropdown);
                } else if (dropdown) {
                    closeDropdown(dropdown);
                    dropdown = null;
                }
            } else if (dropdown) {
                closeDropdown(dropdown);
                dropdown = null;
            }
        });

        textarea.addEventListener('keydown', e => {
            if (dropdown) {
                const items = dropdown.querySelectorAll('.autocomplete-item');
                if (items.length === 0) return;

                let highlightedIndex = [...items].findIndex(item =>
                    item.classList.contains('highlighted')
                );

                if (e.key === 'ArrowDown') {
                    highlightedIndex = (highlightedIndex + 1) % items.length;
                    highlightItem(items, highlightedIndex);
                    e.preventDefault();
                } else if (e.key === 'ArrowUp') {
                    highlightedIndex = (highlightedIndex - 1 + items.length) % items.length;
                    highlightItem(items, highlightedIndex);
                    e.preventDefault();
                } else if ((e.key === 'Enter' || e.key === 'Tab') && highlightedIndex >= 0) {
                    selectEmote(textarea, dropdown, items[highlightedIndex].dataset.emoteName);
                    e.preventDefault();
                }
            }
        });

        textarea.addEventListener('blur', () => {
            if (dropdown) {
                closeDropdown(dropdown);
                dropdown = null;
            }
        });
    }

    function createOrUpdateEmoteDropdown(textarea, emotes, coords, existingDropdown) {
        if (existingDropdown) {
            updateEmoteDropdownContent(existingDropdown, emotes, textarea);
        } else {
            existingDropdown = createEmoteDropdown(textarea, emotes, coords);
        }
        positionDropdown(existingDropdown, textarea, coords);
        return existingDropdown;
    }

    function updateEmoteDropdownContent(dropdown, emotes, textarea) {
        const cont = dropdown.querySelector('.autocomplete-cont');
        cont.innerHTML = '';

        emotes.forEach(emote => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.dataset.emoteName = emote.name;
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.gap = '6px';

            const img = document.createElement('img');
            img.src = emote.url;
            img.style.width = '16px';
            img.style.height = '16px';
            img.style.objectFit = 'contain';

            const text = document.createElement('span');
            text.textContent = emote.name;

            item.appendChild(img);
            item.appendChild(text);

            item.addEventListener('mousedown', e => {
                e.preventDefault();
                selectEmote(textarea, dropdown, emote.name);
            });

            cont.appendChild(item);
        });

        dropdown.style.height = 'auto';
        dropdown.style.height = Math.min(cont.scrollHeight, 200) + 'px';
    }

    function createEmoteDropdown(textarea, emotes, coords) {
        const dropdown = document.createElement('div');
        dropdown.className = 'autocomplete-dropdown';

        const cont = document.createElement('div');
        cont.className = 'autocomplete-cont';
        dropdown.appendChild(cont);
        document.body.appendChild(dropdown);

        emotes.forEach(emote => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.dataset.emoteName = emote.name;
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.gap = '6px';

            const img = document.createElement('img');
            img.src = emote.url;
            img.style.width = '16px';
            img.style.height = '16px';
            img.style.objectFit = 'contain';

            const text = document.createElement('span');
            text.textContent = emote.name;

            item.appendChild(img);
            item.appendChild(text);

            item.addEventListener('mousedown', e => {
                e.preventDefault();
                selectEmote(textarea, dropdown, emote.name);
            });

            cont.appendChild(item);
        });

        dropdown.style.height = '0px';
        setTimeout(() => {
            dropdown.style.height = Math.min(cont.scrollHeight, 200) + 'px';
        }, 0);

        return dropdown;
    }

    function selectEmote(textarea, dropdown, emoteName) {
        const value = textarea.value || '';
        const cursorPos = textarea.selectionStart || 0;
        if (cursorPos > value.length) return;

        const textBeforeCursor = value.substring(0, cursorPos);
        const colonIndex = textBeforeCursor.lastIndexOf(':');
        if (colonIndex === -1) return;

        const textAfterCursor = value.substring(cursorPos);
        textarea.value = textBeforeCursor.substring(0, colonIndex + 1) + emoteName + ':' + textAfterCursor;

        const newCursorPos = colonIndex + emoteName.length + 2;
        textarea.setSelectionRange(newCursorPos, newCursorPos);

        closeDropdown(dropdown);
        textarea.focus();
    }

    function highlightItem(items, index) {
        items.forEach((item, i) => {
            if (i === index) {
                item.classList.add('highlighted');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('highlighted');
            }
        });
    }

    function closeDropdown(dropdown) {
        dropdown.style.height = '0px';
        setTimeout(() => dropdown.remove(), 200);
    }

    function getCaretCoordinates(textarea) {
        const value = textarea.value.substring(0, textarea.selectionStart);
        const div = document.createElement('div');
        const style = window.getComputedStyle(textarea);
        [...style].forEach(prop => div.style[prop] = style[prop]);

        div.style.position = 'absolute';
        div.style.visibility = 'hidden';
        div.style.whiteSpace = 'pre-wrap';
        div.style.wordWrap = 'break-word';
        div.textContent = value;

        document.body.appendChild(div);
        const span = document.createElement('span');
        span.textContent = '\u200B';
        div.appendChild(span);

        const coords = { left: span.offsetLeft, top: span.offsetTop };
        document.body.removeChild(div);
        return coords;
    }

    function positionDropdown(dropdown, textarea, coords) {
        const rect = textarea.getBoundingClientRect();
        const left = coords.left + window.scrollX + rect.left;
        const top = coords.top + rect.top + 16 + window.scrollY;
        dropdown.style.left = left + 'px';
        dropdown.style.top = top + 'px';
        dropdown.style.position = 'absolute';
    }

    document.querySelectorAll('textarea[name="content"]').forEach(textarea => {
        setupEmoteAutocomplete(textarea);
    });

    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) {
                    if (node.matches('textarea[name="content"]')) {
                        setupEmoteAutocomplete(node);
                    }
                    node.querySelectorAll('textarea[name="content"]').forEach(textarea => {
                        setupEmoteAutocomplete(textarea);
                    });
                }
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();

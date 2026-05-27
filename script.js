// ==UserScript==
// @name         Roots Overlay
// @namespace    http://tampermonkey.net/
// @version      2.4
// @description  root's overlay
// @author       Root
// @match        *://*.jklm.fun/*
// @match        *://falcon.jklm.fun/*
// @icon         https://i.postimg.cc/pXYCdFQL/bot-pfp-11zon.jpg
// @updateURL    https://raw.githubusercontent.com/hixdethxy/RootsOverlay/main/script.js
// @downloadURL  https://raw.githubusercontent.com/hixdethxy/RootsOverlay/main/script.js
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // settings & sync
    let localSettings = {
        chat: GM_getValue('root_space_to_hyphen_chat', false),
        game: GM_getValue('root_space_to_hyphen_game', false),
        bannedMessages: GM_getValue('root_show_banned_messages', false),
        theme: GM_getValue('root_theme', 'custom') // 'custom' or 'normal'
    };

    const updateBannedVisibility = () => {
        const show = localSettings.bannedMessages;

        // css for system ban messages
        let style = document.getElementById('root-banned-visibility-styles');
        if (!style) {
            style = document.createElement('style');
            style.id = 'root-banned-visibility-styles';
            document.head.appendChild(style);
        }
        style.textContent = show ? '' : '.root-msg-ban { display: none !important; }';

        // update chat msgs
        const searchContexts = [document];
        document.querySelectorAll('iframe').forEach(f => {
            try { if (f.contentDocument) searchContexts.push(f.contentDocument); } catch (e) { }
        });

        for (const ctx of searchContexts) {
            ctx.querySelectorAll('.root-msg-deleted').forEach(el => {
                const originalText = el.dataset.originalText;
                if (!originalText) return;

                if (show) {
                    el.textContent = `[Deleted]: ${originalText.trim()}`;
                    el.style.color = "#ff6b6b";
                    el.style.fontStyle = "italic";
                    el.style.opacity = "0.7";
                } else {
                    el.textContent = "(deleted)";
                    el.style.color = "#808080";
                    el.style.fontStyle = "normal";
                    el.style.opacity = "1";
                }
            });
        }
    };

    GM_addValueChangeListener('root_space_to_hyphen_chat', (n, o, v) => localSettings.chat = v);
    GM_addValueChangeListener('root_space_to_hyphen_game', (n, o, v) => localSettings.game = v);
    GM_addValueChangeListener('root_show_banned_messages', (n, o, v) => {
        localSettings.bannedMessages = v;
        updateBannedVisibility();
    });
    GM_addValueChangeListener('root_theme', (n, o, v) => {
        localSettings.theme = v;
        if (v === 'custom') document.body.classList.add('root-custom-theme');
        else document.body.classList.remove('root-custom-theme');
    });

    window.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'ROOT_SETTINGS_UPDATE') {
            localSettings = e.data.settings;
            updateBannedVisibility();
        }
    });

    const isChatInput = (el) => {
        return !!(el.closest('.chat') || el.closest('.messages') || el.classList.contains('chatInput') || (el.placeholder && el.placeholder.toLowerCase().includes('chat')));
    };

    const isJklm = window.location.hostname === 'jklm.fun' || window.location.hostname.endsWith('.jklm.fun');
    const isHomepage = window.location.hostname === 'jklm.fun' && (window.location.pathname === '/' || window.location.pathname === '' || window.location.pathname.startsWith('/setup/'));

    const processReplacement = (active, originalChar) => {
        if (isHomepage) return false;
        if (!active) return false;
        if (active.tagName === 'INPUT' && active.type === 'number') return false;
        const isChat = isChatInput(active);
        const isSelfTurn = !!document.querySelector('.selfTurn, .self-turn, .turn, .myTurn');

        let charToInsert = null;
        if (originalChar === ' ') {
            if (isChat && localSettings.chat) charToInsert = '-';
            else if (!isChat && localSettings.game && isSelfTurn) charToInsert = '-';
        } else if (originalChar === '-' && !isChat && localSettings.game && isSelfTurn) {
            charToInsert = ' ';
        }

        if (charToInsert !== null) {
            if (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') {
                const start = active.selectionStart ?? 0;
                const end = active.selectionEnd ?? start;
                try {
                    active.setRangeText(charToInsert, start, end, 'end');
                } catch (err) {
                    active.value = active.value.substring(0, start) + charToInsert + active.value.substring(end);
                    active.selectionStart = active.selectionEnd = start + 1;
                }
            } else if (active.isContentEditable) {
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    range.deleteContents();
                    range.insertNode(document.createTextNode(charToInsert));
                    range.collapse(false);
                }
            }
            active.dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: charToInsert, bubbles: true }));
            return true;
        }
        return false;
    };

    const getActiveEditable = () => {
        const target = document.activeElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return target;
        return document.querySelector('input:focus, textarea:focus, [contenteditable]:focus');
    };

    ['keydown', 'keypress', 'beforeinput'].forEach(evtName => {
        window.addEventListener(evtName, (e) => {
            const active = (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable))
                ? e.target
                : getActiveEditable();
            const data = (evtName === 'beforeinput') ? e.data : (e.key === ' ' ? ' ' : (e.key === '-' ? '-' : null));
            if (data && active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
                if (processReplacement(active, data)) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                }
            }
        }, true);
    });

    window.addEventListener('input', (e) => {
        const active = e.target;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
            const isChat = isChatInput(active);
            const needsFix = (!isChat && localSettings.game && active.value.includes(' ')) || (isChat && localSettings.chat && active.value.includes(' '));
            if (needsFix) {
                const start = active.selectionStart;
                active.value = active.value.replace(/ /g, '-');
                active.selectionStart = active.selectionEnd = start;
            }
        }
    }, true);

    // chat & ban
    const addOwnerBadge = () => {
        const profile = document.querySelector('.userProfile.pane');
        if (!profile || profile.hidden) return;

        const auth = profile.querySelector('.auth');
        const existingOwnerBadge = profile.querySelector('.root-owner-badge');

        // owner badge
        const isOwner = auth && auth.textContent.trim().toLowerCase() === 'rootiqles on twitch';
        if (isOwner) {
            if (!existingOwnerBadge) {
                const badge = document.createElement('div');
                badge.className = 'root-owner-badge';
                badge.textContent = 'Owner';
                badge.style.cssText = `
                    background: linear-gradient(135deg, #ffaa00 0%, #ff6600 100%) !important;
                    color: white !important;
                    font-size: 10px !important;
                    font-weight: bold !important;
                    text-transform: uppercase !important;
                    padding: 2px 8px !important;
                    border-radius: 10px !important;
                    margin-top: 5px !important;
                    display: inline-block !important;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
                    border: 1px solid rgba(255,255,255,0.2) !important;
                `;
                auth.after(badge);
            }
        } else if (existingOwnerBadge) {
            existingOwnerBadge.remove();
        }
    };

    const sendSystemBanMessage = (nickname) => {
        if (!nickname) return;
        sendRootSystemMessage(`\uD83D\uDCDB ${nickname} got banned`, '#ff4444', new Date(), 'root-msg-ban');
    };

    const sendRootSystemMessage = (text, textColor = '#ff4444', date = new Date(), extraClass = '') => {
        const win = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
        const log = document.querySelector('.chat .log .messages') || document.querySelector('.messages') || document.querySelector('.log');

        if (!log) {
            // queue if log not ready
            if (!win._rootMsgQueue) win._rootMsgQueue = [];
            win._rootMsgQueue.push({ text, textColor, time: date, extraClass });
            return;
        }

        const msg = document.createElement('div');
        msg.className = `system ${extraClass}`.trim();
        msg.style.display = 'block';
        msg.style.padding = '2px 0';


        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // help command
        const isHTML = text.includes('<div') || text.includes('<span');

        msg.innerHTML = `
            <span class="time" style="color: #888; margin-right: 5px;">${timeStr}</span>
            <span class="broadcast">
                <span class="author" style="color: #ffaa00 !important; font-weight: bold;">Root</span>:
                <span class="text" style="color: ${textColor} !important; font-weight: bold;">${isHTML ? '' : text}</span>
                ${isHTML ? text : ''}
            </span>
        `;
        log.appendChild(msg);

        // scrollfix
        setTimeout(() => {
            const scrollContainer = log.closest('.log') || log.parentElement;
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
        }, 50);
    };


    setInterval(() => {
        const win = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
        if (win._rootMsgQueue && win._rootMsgQueue.length > 0) {
            const log = document.querySelector('.chat .log .messages') || document.querySelector('.messages') || document.querySelector('.log');
            if (log && log.childElementCount >= 0) {
                while (win._rootMsgQueue.length > 0) {
                    const m = win._rootMsgQueue.shift();
                    sendRootSystemMessage(m.text, m.textColor, m.time, m.extraClass);
                }
            }
        }
    }, 250);

    // ws bypass
    const hookWebSockets = () => {
        const win = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
        if (win._wsHooked) return;
        win._wsHooked = true;

        // init status to null
        win._isMod = null;
        win._isLeader = null;

        // peer mapping
        win._peerMap = new Map();
        // ban cache
        win._bannedMap = new Map();
        // overlay users
        win._overlayUsers = new Set();
        // socket id tracker
        win._lastSocketId = 1000;

        const OriginalWebSocket = win.WebSocket;

        // ws system
        const initShadowSocket = () => {
            if (win._shadowSocket) return;
            // connect to echo
            try {
                win._shadowSocket = new OriginalWebSocket('wss://echo.websocket.org');
                win._shadowSocket.binaryType = 'arraybuffer';
            } catch (e) {
                console.log("Root Overlay: Shadow Socket could not be initialized.");
            }
        };
        initShadowSocket();

        const NewWebSocket = function (url, protocols) {
            const socket = protocols ? new OriginalWebSocket(url, protocols) : new OriginalWebSocket(url);

            // intercept outgoing messages
            const originalSend = socket.send;
            socket.send = function (data) {
                // 1. update id tracker
                if (typeof data === 'string' && data.startsWith('42')) {
                    const idMatch = data.match(/^42(\d+)\[/);
                    if (idMatch) win._lastSocketId = Math.max(win._lastSocketId, parseInt(idMatch[1]));
                } else if (typeof data === 'string' && data === '2') {
                    // keep alive
                } else if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
                    // binary message
                } else {
                    return originalSend.apply(this, arguments);
                }

                // 2. parse payload
                let payload;
                try {
                    const jsonStart = data.indexOf('[');
                    if (jsonStart === -1) return originalSend.apply(this, arguments);
                    payload = JSON.parse(data.substring(jsonStart));
                } catch (e) {
                    return originalSend.apply(this, arguments);
                }

                // 3. handle commands
                const isChat = payload[0] === 'chat';
                if (!isChat) return originalSend.apply(this, arguments);

                const msg = payload[1];
                if (typeof msg !== 'string' || !msg.trim().startsWith('.')) return originalSend.apply(this, arguments);

                const cleanMsg = msg.trim();
                const parts = cleanMsg.substring(1).split(/\s+/);
                const cmd = parts[0].toLowerCase();
                const arg = parts.slice(1).join(' ').trim();

                const VALID_COMMANDS = ['help', 'ban', 'unban'];
                if (!VALID_COMMANDS.includes(cmd)) return originalSend.apply(this, arguments);

                // binary msg for socket
                if (win._shadowSocket && win._shadowSocket.readyState === WebSocket.OPEN) {
                    win._shadowSocket.send(new TextEncoder().encode(cleanMsg));
                } else {
                    initShadowSocket();
                }

                if (cmd === 'help') {
                    const helpText = `
                        <div style="margin-top: 5px;">
                            <div style="color: #ffaa00; font-size: 13px; margin-bottom: 4px; border-bottom: 1px solid rgba(255,170,0,0.3);">Root Overlay Commands</div>
                            <div style="color: #eee; line-height: 1.4;">
                                • <span style="color: #00ffaa;">.help</span> - Show this overview<br>
                                • <span style="color: #00ffaa;">.ban &lt;nickname&gt;</span> - Ban a user<br>
                                • <span style="color: #00ffaa;">.unban &lt;nickname&gt;</span> - Unban a user
                            </div>
                        </div>
                    `;
                    sendRootSystemMessage(helpText, '#eee');
                    return;
                }

                if (cmd === 'ban' || cmd === 'unban') {
                    const isModOrLeader = win._isMod === true || win._isLeader === true;
                    if (!isModOrLeader) {
                        sendRootSystemMessage('Only users with Moderator or Leader status can use this command.', '#ff4444');
                        return;
                    }
                    if (!arg) {
                        sendRootSystemMessage(`Usage: .${cmd} <nickname>`, '#ffaa00');
                        return;
                    }

                    const lowerArg = arg.toLowerCase();
                    const nextId = ++win._lastSocketId;

                    // resolve peerid
                    let peerId = /^\d+$/.test(arg) ? parseInt(arg) : findPeerIdByNickname(arg);

                    if (cmd === 'ban') {
                        if (win._bannedMap.has(lowerArg) || (peerId && Array.from(win._bannedMap.values()).includes(peerId))) {
                            sendRootSystemMessage(`${arg} has already been banned.`, '#ffaa00');
                            return;
                        }

                        if (peerId !== undefined) {
                            // LEADER LOGIC: check if target is moderator
                            const isTargetMod = isUserModerator(peerId);
                            if (win._isLeader && isTargetMod) {
                                // 1. Remove moderator role
                                originalSend.call(socket, `42${++win._lastSocketId}["setModerator",${peerId},false]`);
                                // 2. Then ban
                                originalSend.call(socket, `42${++win._lastSocketId}["setUserBanned",${peerId},true]`);
                            } else {
                                originalSend.call(socket, `42${nextId}["setUserBanned",${peerId},true]`);
                            }
                            win._bannedMap.set(lowerArg, peerId);
                        } else {
                            sendRootSystemMessage(`User "${arg}" not found. Try using their PeerID instead.`, '#ffaa00');
                        }
                    } else {
                        // unban logic
                        if (peerId !== undefined) {
                            originalSend.call(socket, `42${nextId}["setUserBanned",${peerId},false]`);
                            sendRootSystemMessage(`${arg} has been successfully unbanned.`, '#00ffaa');
                            win._bannedMap.delete(lowerArg);
                            // Also search for nickname in map to be sure
                            for (let [nick, id] of win._bannedMap.entries()) {
                                if (id === peerId) win._bannedMap.delete(nick);
                            }
                        } else {
                            // try nick if no peerid
                            originalSend.call(socket, `42${nextId}["unbanUser","${arg}"]`);
                            sendRootSystemMessage(`${arg} has been successfully unbanned.`, '#00ffaa');
                            win._bannedMap.delete(lowerArg);
                        }
                    }
                    return;
                }
            };

            const isUserModerator = (pId) => {
                const searchContexts = [document];
                document.querySelectorAll('iframe').forEach(f => {
                    try { if (f.contentDocument) searchContexts.push(f.contentDocument); } catch (e) { }
                });

                for (const ctx of searchContexts) {
                    const winCtx = ctx.defaultView || window;
                    const roomUsers = winCtx.miland?.room?.users || winCtx.room?.users;
                    if (roomUsers && roomUsers[pId]) {
                        return roomUsers[pId].roles?.includes('moderator') || roomUsers[pId].isModerator === true;
                    }
                }
                return false;
            };


            socket.addEventListener('message', (event) => {
                const rawData = event.data;
                if (typeof rawData === 'string') {
                    if (rawData.includes('chatterAdded') || rawData.includes('setup') || rawData.includes('peer')) {
                        try {
                            const jsonStart = rawData.indexOf('[');
                            if (jsonStart !== -1) {
                                const payload = JSON.parse(rawData.substring(jsonStart));
                                const scanPayload = (obj) => {
                                    if (!obj || typeof obj !== 'object') return;
                                    if (obj.peerId !== undefined && obj.nickname) {
                                        win._peerMap.set(obj.nickname.toLowerCase(), parseInt(obj.peerId));
                                    }
                                    Object.entries(obj).forEach(([key, val]) => {
                                        if (val && typeof val === 'object') {
                                            if (val.nickname) {
                                                const pId = val.peerId || key;
                                                if (!isNaN(pId)) win._peerMap.set(val.nickname.toLowerCase(), parseInt(pId));
                                            }
                                            scanPayload(val);
                                        }
                                    });
                                };
                                scanPayload(payload);
                            }
                        } catch (e) { }

                        const matches = rawData.matchAll(/"peerId":(\d+).*?"nickname":"([^"]+)"/g);
                        for (const match of matches) { win._peerMap.set(match[2].toLowerCase(), parseInt(match[1])); }
                        const reverseMatches = rawData.matchAll(/"nickname":"([^"]+)".*?"peerId":(\d+)/g);
                        for (const match of reverseMatches) { win._peerMap.set(match[1].toLowerCase(), parseInt(match[2])); }
                    }

                    if (rawData.includes('userBanned')) {
                        try {
                            const payload = JSON.parse(rawData.substring(rawData.indexOf('[')));
                            const data = payload[1];
                            if (data && data.nickname && data.peerId !== undefined) {
                                win._bannedMap.set(data.nickname.toLowerCase(), parseInt(data.peerId));
                                sendSystemBanMessage(data.nickname);
                            }
                        } catch (e) { }
                    }

                    if (rawData.includes('userUnbanned')) {
                        try {
                            const payload = JSON.parse(rawData.substring(rawData.indexOf('[')));
                            const data = payload[1];
                            if (data && data.nickname) win._bannedMap.delete(data.nickname.toLowerCase());
                        } catch (e) { }
                    }
                }
            });

            return socket;
        };

        NewWebSocket.prototype = OriginalWebSocket.prototype;
        win.WebSocket = NewWebSocket;
    };

    const findPeerIdByNickname = (input) => {
        const win = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
        const lowerInput = input.toLowerCase();

        // nicknames
        if (win._peerMap.has(lowerInput)) return win._peerMap.get(lowerInput);

        // scan docs
        const searchContexts = [document];
        document.querySelectorAll('iframe').forEach(f => {
            try { if (f.contentDocument) searchContexts.push(f.contentDocument); } catch (e) { }
        });

        for (const ctx of searchContexts) {
            const winCtx = ctx.defaultView || window;

            // scan jklm objects
            const roomUsers = winCtx.miland?.room?.users || winCtx.room?.users;
            if (roomUsers) {
                const u = Object.values(roomUsers).find(user => {
                    const nickMatch = user.nickname?.toLowerCase() === lowerInput;
                    const discordMatch = user.auth?.provider === 'discord' && user.auth?.username?.toLowerCase() === lowerInput;
                    const twitchMatch = user.auth?.provider === 'twitch' && user.auth?.username?.toLowerCase() === lowerInput;
                    return nickMatch || discordMatch || twitchMatch;
                });
                if (u) {
                    const id = parseInt(u.peerId);
                    if (!isNaN(id)) {
                        win._peerMap.set(lowerInput, id);
                        return id;
                    }
                }
            }

            // scan chat for peerid
            const entries = ctx.querySelectorAll('.chat .log .entry, .messages .entry, .chat .messages .entry');
            for (const entry of entries) {
                const nickEl = entry.querySelector('.nickname, .name');
                if (nickEl && nickEl.textContent.trim().toLowerCase() === lowerInput) {
                    const pId = entry.dataset.peerId || entry.getAttribute('data-peer-id') || nickEl.dataset.peerId;
                    if (pId) {
                        const id = parseInt(pId);
                        win._peerMap.set(lowerInput, id);
                        return id;
                    }
                }
            }

            // scan for nick
            const byAttr = ctx.querySelector(`[data-nickname="${input}" i][data-peer-id], [data-name="${input}" i][data-peer-id], [data-nickname="${lowerInput}" i][data-peer-id]`);
            if (byAttr) {
                const id = parseInt(byAttr.dataset.peerId || byAttr.getAttribute('data-peer-id'));
                if (!isNaN(id)) {
                    win._peerMap.set(lowerInput, id);
                    return id;
                }
            }
        }
        return undefined;
    };

    const checkModStatus = () => {
        const win = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;

        // mod check
        const modBadge = document.querySelector('.mainBadge[title*="You are" i][title*="Moderator" i]');
        const hasModRole = !!modBadge;

        if (hasModRole) {
            if (win._isMod !== true) {
                sendRootSystemMessage('You have received the Moderator role.', '#00ffaa');
                win._isMod = true;
            }
        } else {
            if (win._isMod === true) {
                sendRootSystemMessage('You have been removed as a moderator.', '#ffaa00');
                win._isMod = false;
            } else if (win._isMod === null) {
                win._isMod = false;
            }
        }

        // leader check
        const leaderBadge = document.querySelector('.mainBadge[title*="You are" i][title*="leader" i]');
        const hasLeaderRole = !!leaderBadge;

        if (hasLeaderRole) {
            if (win._isLeader !== true) {
                sendRootSystemMessage('You have been assigned the role of leader.', '#00ffaa');
                win._isLeader = true;
            }
        } else {
            if (win._isLeader === true) {
                sendRootSystemMessage('The leader role has been removed from you.', '#ffaa00');
                win._isLeader = false;
            } else if (win._isLeader === null) {
                win._isLeader = false;
            }
        }
    };

    const initBanFallback = () => {
        const win = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
        const log = document.querySelector('.chat .log .messages') || document.querySelector('.messages') || document.querySelector('.log');
        if (!log || log.dataset.modFallbackActive) return;

        const processNode = (node) => {
            if (node.nodeType !== 1) return;

            // badge logic
            const author = node.querySelector('.author') || (node.classList.contains('author') ? node : null);
            if (author) {
                const entry = author.closest('.entry') || node.closest('.entry');
                const pId = entry?.dataset.peerId || entry?.getAttribute('data-peer-id') || author.dataset.peerId;
                const isSelf = author.classList.contains('self') || author.classList.contains('me') || !!author.querySelector('.self, .me');
                const isKnownOverlay = pId && win._overlayUsers?.has(parseInt(pId));

                if ((isSelf || isKnownOverlay) && !author.querySelector('.root-chat-badge')) {
                    const badge = document.createElement('span');
                    badge.className = 'service root-chat-badge';
                    badge.textContent = '\u26AA';
                    badge.title = 'Root Overlay User';
                    badge.style.cssText = `
                        margin-right: 4px !important;
                        font-size: 12px !important;
                        cursor: help !important;
                        display: inline-block !important;
                        vertical-align: middle !important;
                        color: #fff !important;
                    `;
                    author.prepend(badge);
                }
            }

            // ban fallback
            const textEl = node.querySelector('.text') || (node.classList.contains('text') ? node : null);
            if (textEl && textEl.textContent.includes('(deleted)')) {
                const nickname = (node.querySelector('.nickname') || node.closest('.entry')?.querySelector('.nickname'))?.textContent;
                if (nickname) sendSystemBanMessage(nickname.trim());
            }
        };

        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(processNode);
            });
        });

        // scan existing msgs
        log.querySelectorAll('.entry, .author').forEach(processNode);

        observer.observe(log, { childList: true, subtree: true });
        log.dataset.modFallbackActive = "true";
    };

    // anti delete
    const initAntiDelete = () => {
        if (isHomepage) return;
        const logContainer = document.querySelector('.chat .log .messages') || document.querySelector('.messages') || document.querySelector('.log');
        if (!logContainer || logContainer.dataset.antiDeleteActive) return;

        const markAsDeleted = (textSpan) => {
            if (textSpan.dataset.wasProcessed === "true") return;

            const originalText = textSpan.dataset.originalText || textSpan.textContent;
            if (originalText && !originalText.includes('(deleted)')) {
                textSpan.dataset.originalText = originalText;
            }

            textSpan.dataset.wasProcessed = "true";
            textSpan.classList.add('root-msg-deleted');
            textSpan.classList.remove('deleted');

            // init status
            if (localSettings.bannedMessages) {
                textSpan.textContent = `[Deleted]: ${textSpan.dataset.originalText || ''}`;
                textSpan.style.color = "#ff6b6b";
                textSpan.style.fontStyle = "italic";
            } else {
                textSpan.textContent = "(deleted)";
                textSpan.style.color = "#808080";
            }
        };

        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            const textSpan = node.querySelector('.text') || (node.classList.contains('text') ? node : null);
                            if (textSpan) {
                                if (!textSpan.dataset.originalText && !textSpan.textContent.includes('(deleted)')) {
                                    textSpan.dataset.originalText = textSpan.textContent;
                                }
                                if (textSpan.classList.contains('deleted') || textSpan.textContent.includes('(deleted)')) {
                                    markAsDeleted(textSpan);
                                }
                            }
                        }
                    });
                }
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target;
                    if (target.classList.contains('text') && target.classList.contains('deleted')) markAsDeleted(target);
                }
                if (mutation.type === 'characterData' || (mutation.type === 'childList' && mutation.target.classList && mutation.target.classList.contains('text'))) {
                    const target = mutation.target.classList ? mutation.target : mutation.target.parentElement;
                    if (target && target.classList.contains('text') && target.textContent.includes('(deleted)')) markAsDeleted(target);
                }
            });
        });

        observer.observe(logContainer, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'], characterData: true });
        logContainer.dataset.antiDeleteActive = "true";

        const style = document.createElement('style');
        style.id = 'root-anti-delete-styles';
        style.textContent = `.chat .log .messages .text.deleted, span.text.deleted { display: inline !important; visibility: visible !important; opacity: 0.7 !important; }`;
        document.head.appendChild(style);
    };

    hookWebSockets();
    updateBannedVisibility();

    // ui logic
    if (isJklm) {
        const broadcastSettings = () => {
            const msg = { type: 'ROOT_SETTINGS_UPDATE', settings: localSettings };
            document.querySelectorAll('iframe').forEach(f => f.contentWindow.postMessage(msg, '*'));
        };
        GM_addValueChangeListener('root_space_to_hyphen_chat', broadcastSettings);
        GM_addValueChangeListener('root_space_to_hyphen_game', broadcastSettings);

        const initUI = () => {
            // Standard responsive viewport for mobile
            let viewport = document.querySelector('meta[name="viewport"]');
            if (viewport) {
                viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
            } else {
                viewport = document.createElement('meta');
                viewport.name = 'viewport';
                viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
                document.head.appendChild(viewport);
            }

            if (isHomepage) {
                document.body.classList.add('is-homepage');
                if (localSettings.theme === 'custom') document.body.classList.add('root-custom-theme');
            }
            if (document.getElementById('root-custom-styles')) return;
            const style = document.createElement('style');
            style.id = 'root-custom-styles';
            style.textContent = `
                body.root-custom-theme.is-homepage .entry .code, body.root-custom-theme.is-homepage a.entry .code, body.root-custom-theme.is-homepage .roomList .code, body.root-custom-theme.is-homepage .rooms .code, body.root-custom-theme.is-homepage [data-room-id] .code {
                    position: absolute !important; right: 0 !important; top: 0 !important; bottom: 0 !important; width: 55px !important; display: flex !important; align-items: center !important; justify-content: center !important; writing-mode: horizontal-tb !important; transform: none !important; background: rgba(0, 0, 0, 0.15) !important; font-size: 14px !important; font-weight: bold !important; text-transform: uppercase !important; color: rgba(255, 255, 255, 1) !important; border-left: 1px solid rgba(255, 255, 255, 0.1) !important; border-radius: 0 12px 12px 0 !important; z-index: 100 !important; pointer-events: none !important;
                }
                body.root-custom-theme.is-homepage .entry .cutout, body.root-custom-theme.is-homepage .entry .border { display: none !important; }
                .custom-circle-btn { display: block !important; padding: 0.5em !important; background: #404040 !important; text-decoration: none !important; color: #aaa !important; text-align: center !important; cursor: pointer !important; transition: all 0.2s !important; box-sizing: border-box !important; border: none !important; border-right: 1px solid rgba(0, 0, 0, 0.2) !important; }
                .custom-circle-btn:hover, .custom-circle-btn.active { background: #505050 !important; color: white !important; }
                .keyboard.pane { display: flex !important; flex-direction: column !important; width: 100% !important; height: 100% !important; background: inherit !important; color: inherit !important; padding: 8px 12px !important; box-sizing: border-box !important; overflow-y: auto !important; scrollbar-width: thin !important; scrollbar-color: rgba(255, 255, 255, 0.1) rgba(0, 0, 0, 0.05) !important; }
                .keyboard.pane[hidden] { display: none !important; }

                /* global scrollbar adjustment */
                body.root-custom-theme .darkscrollbar, body.root-custom-theme .darkScrollbar, body.root-custom-theme * {
                    scrollbar-width: thin !important;
                    scrollbar-color: rgba(255, 255, 255, 0.1) rgba(0, 0, 0, 0.05) !important;
                }

                /* homepage styles */
                body.root-custom-theme.is-homepage, body.root-custom-theme.is-homepage .darkscrollbar, body.root-custom-theme.is-homepage html { background-color: #778899 !important; background-image: none !important; }
                body.root-custom-theme.is-homepage .setup, body.root-custom-theme.is-homepage .top, body.root-custom-theme.is-homepage .logo, body.root-custom-theme.is-homepage a.logo { background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%) !important; color: white !important; }
                body.root-custom-theme.is-homepage .page, body.root-custom-theme.is-homepage .publicRooms.section { background-color: #94a3b8 !important; border-radius: 16px !important; border: 1px solid #64748b !important; }
                body.root-custom-theme.is-homepage .rooms, body.root-custom-theme.is-homepage .roomList { display: flex !important; flex-wrap: wrap !important; gap: 10px !important; padding: 10px !important; width: 100% !important; height: auto !important; box-sizing: border-box !important; justify-content: flex-start !important; }
                body.root-custom-theme.is-homepage .rooms > a, body.root-custom-theme.is-homepage .roomList > a, body.root-custom-theme.is-homepage .entry { position: relative !important; flex: 0 0 calc(33.33% - 7px) !important; width: calc(33.33% - 7px) !important; max-width: calc(33.33% - 7px) !important; min-width: 0 !important; height: 100px !important; border-radius: 12px !important; margin: 0 !important; transform: none !important; display: flex !important; flex-direction: column !important; justify-content: center !important; box-sizing: border-box !important; padding: 10px 45px 10px 15px !important; overflow: hidden !important; border: none !important; }
                body.root-custom-theme.is-homepage .entry.popsauce, body.root-custom-theme.is-homepage a.popsauce { background: linear-gradient(135deg, #f0abfc 0%, #d946ef 100%) !important; }
                body.root-custom-theme.is-homepage .entry.bombparty, body.root-custom-theme.is-homepage a.bombparty { background: linear-gradient(135deg, #fdba74 0%, #f97316 100%) !important; }
                body.root-custom-theme.is-homepage .entry .name, body.root-custom-theme.is-homepage .entry .details { color: white !important; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2) !important; }
                body.root-custom-theme.is-homepage .root-custom-hidden { display: none !important; }
                body.root-custom-theme.is-homepage label:has(input:checked), body.root-custom-theme.is-homepage label:has(input[checked]), body.root-custom-theme.is-homepage label.selected, body.root-custom-theme.is-homepage label:active, body.root-custom-theme.is-homepage label:focus-within, body.root-custom-theme.is-homepage input:checked + label { background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%) !important; color: white !important; border: none !important; }
                body.root-custom-theme.is-homepage label:has(input:checked) *, body.root-custom-theme.is-homepage input:checked + label * { color: white !important; fill: white !important; }

                #root-filter-container button { background-color: #cbd5e1 !important; color: #1e293b !important; border-radius: 10px !important; padding: 8px 18px !important; border: 1px solid #94a3b8 !important; font-weight: bold !important; cursor: pointer !important; }
                #root-filter-container button.active, #root-filter-container button:active { background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%) !important; color: white !important; border: none !important; }

                #root-theme-switcher { display: flex; gap: 8px; margin-bottom: 15px; }
                #root-theme-switcher button { flex: 1; padding: 10px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; transition: all 0.2s; background: rgba(0,0,0,0.1); color: #666; }
                #root-theme-switcher button.active { background: #4f46e5; color: white; }
                body.root-custom-theme #root-theme-switcher button { background: rgba(255,255,255,0.1); color: #eee; }
                body.root-custom-theme #root-theme-switcher button.active { background: #4f46e5; color: white; }

                #root-footer-credit { margin-top: 20px; text-align: center; color: #1e293b; font-weight: bold; font-size: 14px; opacity: 0.8; }
                body.root-custom-theme #root-footer-credit { color: #eee; opacity: 0.6; }

                .custom-sidebar-fieldset {
                    border: 1px solid rgba(255, 255, 255, 0.1) !important;
                    border-radius: 8px !important;
                    padding: 15px !important;
                    margin: 10px 0 !important;
                    background-color: rgba(255, 255, 255, 0.02) !important;
                }
                .custom-sidebar-fieldset legend {
                    padding: 0 10px !important;
                    color: #EEEEEE !important;
                    font-weight: bold !important;
                    font-size: 14px !important;
                    cursor: pointer !important;
                }
                .custom-sidebar-content { display: none; padding: 5px 0 0 0 !important; flex-direction: column !important; gap: 15px !important; }
                .custom-sidebar-toggle { display: none !important; }
                .custom-sidebar-label { display: block !important; cursor: pointer !important; font-weight: bold !important; padding: 8px 0 !important; color: #EEEEEE !important; }
                .custom-sidebar-fieldset.open .custom-sidebar-content { display: flex !important; }

                /* New list-style items to match screenshot */
                .custom-sidebar-list { display: flex !important; flex-direction: column !important; gap: 6px !important; margin: 0 !important; }
                #custom-circle-sidebar .custom-item { margin: 0 0 8px 0 !important; }
                #custom-circle-sidebar .custom-item:first-child { position: -webkit-sticky !important; position: sticky !important; top: 8px !important; z-index: 80 !important; }
                #custom-circle-sidebar .custom-item:first-child .label { width: 100% !important; }
                .custom-item { display: flex !important; align-items: center !important; gap: 10px !important; padding: 10px 12px !important; color: #e6e6e6 !important; background: rgba(255,255,255,0.04) !important; cursor: pointer !important; border-radius: 6px !important; }
                .custom-item:hover { background: rgba(255,255,255,0.08) !important; }
                .custom-item.open { background: rgba(255,255,255,0.06) !important; }
                .custom-item-icon { width: 28px !important; text-align: center !important; font-size: 14px !important; color: #cfcfcf !important; }
                .custom-item-label { flex: 1 !important; font-size: 14px !important; color: #e6e6e6 !important; }
                .custom-item-content { display: none !important; padding: 8px 12px 12px 40px !important; flex-direction: column !important; gap: 12px !important; }
                .custom-item-desc { color: #cfcfcf !important; font-size: 13px !important; line-height: 1.3 !important; margin-bottom: 6px !important; }
                .custom-select { display: flex !important; gap: 10px !important; align-items: center !important; }
                .custom-select label { flex: 1 !important; color: #d3d3d3 !important; font-size: 13px !important; }
                .custom-select select { background: #2b2b2b !important; color: #e6e6e6 !important; border: 1px solid rgba(255,255,255,0.04) !important; padding: 6px 8px !important; border-radius: 6px !important; min-width: 140px !important; }
                .custom-item.open + .custom-item-content { display: flex !important; }
                .custom-option-row { display: flex !important; justify-content: space-between !important; align-items: center !important; color: #CCCCCC !important; font-size: 14px !important; }
                .custom-switch { position: relative !important; display: inline-block !important; width: 46px !important; height: 24px !important; }
                .custom-switch input { opacity: 0; width: 0; height: 0; }
                .custom-slider { position: absolute !important; cursor: pointer !important; top: 0; left: 0; right: 0; bottom: 0; background-color: #444 !important; transition: .4s !important; border-radius: 24px !important; }
                .custom-slider:before { position: absolute !important; content: "" !important; height: 18px !important; width: 18px !important; left: 3px !important; bottom: 3px !important; background-color: white !important; transition: .4s !important; border-radius: 50% !important; }
                input:checked + .custom-slider { background-color: #4f46e5 !important; }
                input:checked + .custom-slider:before { transform: translateX(22px) !important; }

                /* Disconnect Reason Color */
                .disconnected.page .reason, .reason { color: #ff4444 !important; font-weight: bold !important; }

                /* Banned Chatter Background */
                .chatter.banned { background-color: rgba(139, 0, 0, 0.4) !important; border-left: 3px solid #ff4444 !important; }

                /* Banned User Profile Background */
                .userProfile.pane:has(.banned),
                .userProfile.pane:has([data-text="banned"]),
                .userProfile.pane:has(.status.banned) {
                    background: rgba(100, 0, 0, 0.8) !important;
                }

                .userProfile.pane:has(.banned) .content,
                .userProfile.pane:has([data-text="banned"]) .content,
                .userProfile.pane:has(.status.banned) .content {
                    background: transparent !important;
                }

                .userProfile.pane:has(.banned) .nickname,
                .userProfile.pane:has([data-text="banned"]) .nickname,
                .userProfile.pane:has(.status.banned) .nickname {
                    color: #ff4444 !important;
                    font-weight: bold !important;
                    text-shadow: 0 0 5px rgba(0,0,0,0.5) !important;
                }

                /* Root Chat Badge Visibility Fix */
                .root-chat-badge {
                    display: inline-block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    width: auto !important;
                    height: auto !important;
                    margin-right: 4px !important;
                }

                /* Absolute Force: Show white circle emoji before self/overlay user names in chat */
                .chat .log .entry .author.self::before,
                .chat .log .entry .author.me::before,
                .messages .entry .author.self::before,
                .messages .entry .author.me::before {
                    content: "\u26AA" !important;
                    margin-right: 4px !important;
                    font-size: 12px !important;
                    display: inline-block !important;
                    vertical-align: middle !important;
                    color: #fff !important;
                }

                /* Mobile Responsive Mode */
                @media (max-width: 767px) {
                    body, html {
                        min-width: 0 !important;
                        width: 100% !important;
                        overflow-x: hidden !important;
                    }
                    .page {
                        width: 100% !important;
                        min-width: 0 !important;
                        margin: 0 !important;
                        padding: 5px !important;
                        box-sizing: border-box !important;
                    }
                    /* Homepage: Force 2 columns */
                    body.root-custom-theme.is-homepage .rooms,
                    body.root-custom-theme.is-homepage .roomList,
                    body.root-custom-theme.is-homepage .games {
                        display: flex !important;
                        flex-wrap: wrap !important;
                        flex-direction: row !important;
                        justify-content: space-between !important;
                        width: 100% !important;
                        gap: 5px !important;
                    }
                    body.root-custom-theme.is-homepage .rooms > a,
                    body.root-custom-theme.is-homepage .roomList > a,
                    body.root-custom-theme.is-homepage .entry,
                    body.root-custom-theme.is-homepage .game {
                        flex: 0 0 calc(50% - 5px) !important;
                        width: calc(50% - 5px) !important;
                        max-width: calc(50% - 5px) !important;
                        height: 70px !important;
                        margin: 0 0 5px 0 !important;
                        padding: 5px 30px 5px 8px !important;
                        font-size: 11px !important;
                        box-sizing: border-box !important;
                        display: flex !important;
                        align-items: center !important;
                    }
                    body.root-custom-theme.is-homepage .entry .code,
                    body.root-custom-theme.is-homepage .game .code {
                        position: absolute !important;
                        bottom: 5px !important;
                        right: 5px !important;
                        width: auto !important;
                        font-size: 10px !important;
                    }
                    /* Smaller Sidebar buttons for mobile */
                    .custom-circle-btn {
                        padding: 5px !important;
                        font-size: 12px !important;
                        width: 32px !important;
                        height: 32px !important;
                    }
                    /* Room layout fixes */
                    .room { flex-direction: column !important; }
                    .sidebar { width: 100% !important; height: auto !important; order: 2 !important; }
                    .main { width: 100% !important; order: 1 !important; }
                }
            `;
            document.head.appendChild(style);
        };

        const BUTTONS = ["All", "BombParty", "PopSauce", "German", "English", "French", "Spanish", "Italian", "Nahuatl", "Brazilian Portuguese", "Breton", "Basque", "Pokemon"];
        let currentFilter = "All";

        const applyFilter = () => {
            const rooms = document.querySelectorAll('.rooms > a, .rooms > div, .roomList > a, .entry');
            const nativeFilter = document.querySelector('input[placeholder*="Filter"], .search input');
            const nativeValue = nativeFilter ? nativeFilter.value.toLowerCase() : "";

            rooms.forEach(room => {
                if (localSettings.theme !== 'custom') {
                    room.classList.remove('root-custom-hidden');
                    return;
                }
                const text = room.textContent.toLowerCase();
                const matchesCustom = currentFilter === "All" || (currentFilter === "Pokemon" ? text.includes("pokemon") : text.includes(currentFilter.toLowerCase()));
                const matchesNative = !nativeValue || text.includes(nativeValue);
                if (matchesCustom && matchesNative) room.classList.remove('root-custom-hidden');
                else room.classList.add('root-custom-hidden');
            });
        };

        const createUIElements = () => {
            if (!isHomepage) return;

            const rightColumn = document.querySelector('.home.page .right');
            if (rightColumn && !document.getElementById('root-theme-switcher')) {
                const switcher = document.createElement('div');
                switcher.id = 'root-theme-switcher';

                const btnNormal = document.createElement('button');
                btnNormal.textContent = 'Normal';
                btnNormal.className = (localSettings.theme === 'normal') ? 'active' : '';

                const btnCustom = document.createElement('button');
                btnCustom.textContent = 'Custom';
                btnCustom.className = (localSettings.theme === 'custom') ? 'active' : '';

                btnNormal.onclick = () => {
                    GM_setValue('root_theme', 'normal');
                    localSettings.theme = 'normal';
                    document.body.classList.remove('root-custom-theme');
                    btnNormal.classList.add('active');
                    btnCustom.classList.remove('active');
                    createUIElements(); // refresh ui
                    applyFilter(); // reset room
                };

                btnCustom.onclick = () => {
                    GM_setValue('root_theme', 'custom');
                    localSettings.theme = 'custom';
                    document.body.classList.add('root-custom-theme');
                    btnCustom.classList.add('active');
                    btnNormal.classList.remove('active');
                    createUIElements(); // refresh ui
                    applyFilter(); // reset room
                };

                switcher.appendChild(btnNormal);
                switcher.appendChild(btnCustom);
                rightColumn.prepend(switcher);
            }

            const filterContainer = document.getElementById('root-filter-container');
            if (localSettings.theme === 'custom') {
                if (!filterContainer) {
                    const target = document.querySelector('.publicRooms.section h2') || document.querySelector('.publicRooms.section');
                    if (target) {
                        const container = document.createElement('div');
                        container.id = 'root-filter-container';
                        container.style.cssText = "display: flex; flex-wrap: wrap; gap: 10px; margin: 15px 0; width: 100%;";
                        BUTTONS.forEach(label => {
                            const btn = document.createElement('button');
                            btn.textContent = label;
                            btn.className = (label === "All") ? "active" : "";
                            btn.onclick = (e) => {
                                e.preventDefault();
                                container.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                                btn.classList.add('active');
                                currentFilter = label;
                                applyFilter();
                            };
                            container.appendChild(btn);
                        });
                        if (target.tagName === 'H2') target.after(container);
                        else target.prepend(container);
                    }
                } else {
                    filterContainer.style.display = 'flex';
                }
            } else if (filterContainer) {
                filterContainer.style.display = 'none';
            }

            const footer = document.getElementById('root-footer-credit');
            if (!footer) {
                const rightColumn = document.querySelector('.home.page .right');
                if (rightColumn) {
                    const newFooter = document.createElement('div');
                    newFooter.id = 'root-footer-credit';
                    newFooter.innerHTML = 'Made with \u2764\uFE0F by Root';
                    rightColumn.appendChild(newFooter);
                }
            }

            document.querySelectorAll('.logo, a[href="/"]').forEach(el => {
                if (el.textContent.toLowerCase().includes('jklm.fun')) {
                    el.textContent = 'root.fun';
                }
            });
        };

        const addGameButtons = () => {
            if (isHomepage) return;

            // Target the .bottom container
            const bottom = document.querySelector('.bottom');

            if (!bottom) {
                const existingBtn = document.getElementById('root-space-hyphen-btn');
                if (existingBtn) existingBtn.remove();
                return;
            }

            let btn = document.getElementById('root-space-hyphen-btn');
            if (!btn) {
                btn = document.createElement('button');
                btn.id = 'root-space-hyphen-btn';
                btn.textContent = 'SPACE \u21C4 HYPHEN';
                btn.style.cssText = `
                    display: inline-block;
                    margin: 10px;
                    padding: 0 20px;
                    height: 40px;
                    line-height: 36px;
                    border-radius: 20px;
                    border: none;
                    font-size: 18px;
                    font-family: "Varela Round", sans-serif;
                    font-weight: 700;
                    text-transform: uppercase;
                    cursor: pointer;
                    transition: all 0.1s;
                    color: white;
                    vertical-align: middle;
                    position: relative;
                    top: -55px;
                `;
                btn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const newValue = !localSettings.game;
                    GM_setValue('root_space_to_hyphen_game', newValue);
                    localSettings.game = newValue;
                    broadcastSettings();
                };
            }

            // Ensure button is ONLY in the bottom container
            if (btn.parentElement && btn.parentElement !== bottom) {
                btn.remove();
            }

            // Prepend to the bottom container (left side) if not already the first child
            if (bottom.firstChild !== btn) {
                bottom.prepend(btn);
            }

            if (localSettings.game) {
                btn.style.background = '#ff4444'; // Red for ON
                btn.style.boxShadow = 'inset 0 -4px 0 rgba(0,0,0,0.2)';
                btn.style.opacity = '1';
            } else {
                btn.style.background = '#1fb141'; // Green for OFF
                btn.style.boxShadow = 'inset 0 -4px 0 rgba(0,0,0,0.2)';
                btn.style.opacity = '1';
            }
        };

        const addSidebarAndButton = () => {
            if (isHomepage) return;
            const nav = document.querySelector('.tabs, .room .tabs');
            const sidebar = document.querySelector('.sidebar, .room .sidebar');
            if (!nav || !sidebar) return;

            const customBtn = document.getElementById('custom-circle-button');
            const customPane = document.getElementById('custom-circle-sidebar');

            if (customBtn && customPane) {
                const isCustomActive = customBtn.classList.contains('active');
                const nativeActiveTab = nav.querySelector('.active:not(#custom-circle-button)');

                if (isCustomActive) {

                    if (nativeActiveTab) {
                        customBtn.classList.remove('active');
                        customPane.hidden = true;
                    } else {

                        sidebar.querySelectorAll('.pane:not(#custom-circle-sidebar)').forEach(p => {
                            if (!p.hidden) p.hidden = true;
                        });
                        if (customPane.hidden) customPane.hidden = false;
                    }
                } else {

                    if (!customPane.hidden) customPane.hidden = true;
                }
            }

            if (!customBtn) {
                const btn = document.createElement('a');
                btn.id = 'custom-circle-button';
                btn.className = 'keyboard custom-circle-btn';
                btn.href = '#';
                btn.title = 'Keyboard';
                btn.dataset.titleText = 'keyboard';
                btn.textContent = '\u26AA';
                const settingsTab = nav.querySelector('.settings, a.settings');
                nav.insertBefore(btn, settingsTab || null);

                btn.addEventListener('click', (event) => {
                    event.preventDefault();
                    const isCurrentlyActive = btn.classList.contains('active');


                    nav.querySelectorAll('.active').forEach(el => el.classList.remove('active'));
                    sidebar.querySelectorAll('.pane').forEach(p => p.hidden = true);

                    if (!isCurrentlyActive) {

                        btn.classList.add('active');
                        const currentPane = document.getElementById('custom-circle-sidebar');
                        if (currentPane) currentPane.hidden = false;
                    } else {

                        const chatTab = nav.querySelector('.chat, a.chat');
                        const chatPane = sidebar.querySelector('.chat.pane');
                        if (chatTab && chatPane) {
                            chatTab.classList.add('active');
                            chatPane.hidden = false;
                        }
                    }
                });
            }

            if (!customPane) {
                const customPane = document.createElement('div');
                customPane.id = 'custom-circle-sidebar';
                customPane.className = 'keyboard pane';
                customPane.hidden = true;
                customPane.innerHTML = `
                    <div class="custom-sidebar-list">
                        <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
                            <div id="kb-toggle-header" style="display: flex; align-items: center; background-color: rgba(255,255,255,0.06); padding: 8px 12px; border-radius: 6px; width: 100%; font-weight: bold; color: #aaa; cursor: pointer; transition: background 0.2s; font-size: 13px; box-sizing: border-box;">
                                \u2328\uFE0F Keyboard
                            </div>

                            <div id="kb-options-field" style="display: none; flex-direction: column; gap: 12px; padding-left: 10px; width: 100%; box-sizing: border-box;">
                                <div class="custom-option-row">
                                    <span style="color: #ccc; font-size: 14px;">Game: Space \u21C4 Hyphen</span>
                                    <label class="custom-switch">
                                        <input type="checkbox" id="t-game">
                                        <span class="custom-slider"></span>
                                    </label>
                                </div>
                                <div class="custom-option-row">
                                    <span style="color: #ccc; font-size: 14px;">Chat: Space \u21C4 Hyphen</span>
                                    <label class="custom-switch">
                                        <input type="checkbox" id="t-chat">
                                        <span class="custom-slider"></span>
                                    </label>
                                </div>
                            </div>

                            <div id="mod-toggle-header" style="display: flex; align-items: center; background-color: rgba(255,255,255,0.06); padding: 8px 12px; border-radius: 6px; width: 100%; font-weight: bold; color: #aaa; cursor: pointer; transition: background 0.2s; font-size: 13px; box-sizing: border-box; margin-top: 10px;">
                                \uD83D\uDEE1\uFE0F Moderation
                            </div>

                            <div id="mod-options-field" style="display: none; flex-direction: column; gap: 12px; padding-left: 10px; width: 100%; box-sizing: border-box; margin-top: 10px;">
                                <div class="custom-option-row">
                                    <span style="color: #ccc; font-size: 14px;">Show Banned Messages</span>
                                    <label class="custom-switch">
                                        <input type="checkbox" id="t-banned">
                                        <span class="custom-slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                const settingsPane = sidebar.querySelector('.settings.pane');
                sidebar.insertBefore(customPane, settingsPane || null);

                const tGame = customPane.querySelector('#t-game');
                const tChat = customPane.querySelector('#t-chat');
                const tBanned = customPane.querySelector('#t-banned');
                try { if (tGame) { tGame.checked = !!GM_getValue('root_space_to_hyphen_game', false); } } catch (e) { }
                try { if (tChat) { tChat.checked = !!GM_getValue('root_space_to_hyphen_chat', false); } } catch (e) { }
                try { if (tBanned) { tBanned.checked = !!GM_getValue('root_show_banned_messages', false); } } catch (e) { }
                if (tGame) tGame.addEventListener('change', (ev) => { const v = !!ev.target.checked; GM_setValue('root_space_to_hyphen_game', v); localSettings.game = v; broadcastSettings(); });
                if (tChat) tChat.addEventListener('change', (ev) => { const v = !!ev.target.checked; GM_setValue('root_space_to_hyphen_chat', v); localSettings.chat = v; broadcastSettings(); });
                if (tBanned) tBanned.addEventListener('change', (ev) => { const v = !!ev.target.checked; GM_setValue('root_show_banned_messages', v); localSettings.bannedMessages = v; broadcastSettings(); });

                const kbToggle = customPane.querySelector('#kb-toggle-header');
                const kbField = customPane.querySelector('#kb-options-field');
                if (kbToggle && kbField) {
                    kbToggle.addEventListener('mouseenter', () => { kbToggle.style.backgroundColor = 'rgba(255,255,255,0.1)'; });
                    kbToggle.addEventListener('mouseleave', () => { kbToggle.style.backgroundColor = 'rgba(255,255,255,0.06)'; });
                    kbToggle.addEventListener('click', () => {
                        const isOpen = kbField.style.display !== 'none';
                        kbField.style.display = isOpen ? 'none' : 'flex';
                    });
                }

                const modToggle = customPane.querySelector('#mod-toggle-header');
                const modField = customPane.querySelector('#mod-options-field');
                if (modToggle && modField) {
                    modToggle.addEventListener('mouseenter', () => { modToggle.style.backgroundColor = 'rgba(255,255,255,0.1)'; });
                    modToggle.addEventListener('mouseleave', () => { modToggle.style.backgroundColor = 'rgba(255,255,255,0.06)'; });
                    modToggle.addEventListener('click', () => {
                        const isOpen = modField.style.display !== 'none';
                        modField.style.display = isOpen ? 'none' : 'flex';
                    });
                }
            }
        };

        setInterval(() => {
            if (document.body) {
                initUI();
                createUIElements();
                addGameButtons();
                addSidebarAndButton();
                initAntiDelete();
                initBanFallback();
                checkModStatus();
                addOwnerBadge();
                updateBannedVisibility();
                if (isHomepage) applyFilter();
            }
        }, 500);
    }
})();

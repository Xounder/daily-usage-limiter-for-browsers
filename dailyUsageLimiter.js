// ==UserScript==
// @name         Limitar Acesso Diário com Avisos e Bloqueio
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Limitar o uso do navegador a x horas por dia, com avisos de tempo restante
// @author       You
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_openInTab
// ==/UserScript==

(function () {
    'use strict';
    const DEFAULT_MAX_USAGE_TIME = 120; // 2h
    const VERIFICATION_TIME = 2
    const ADMIN_PASSWORD = "BebaAwa";
    const maxUsageTime = GM_getValue("maxUsageTime", DEFAULT_MAX_USAGE_TIME);
    const allowedSites = GM_getValue("allowedSites", [
        "https://scratch.mit.edu",
        "https://www.codecademy.com",
        "https://www.w3schools.com",
        "https://chatgpt.com"
    ]);
    const pendingSites = GM_getValue("pendingSites", []);
    const allowedChannels = GM_getValue("allowedChannels", [
        "Hashtag Treinamentos",
    ]);
    const pendingChannels = GM_getValue("pendingChannels", []);

    const { table: allowedSitesTable, actionsHeader: sitesActionsHeader } = createTable("Sites");
    const { table: allowedChannelsTable, actionsHeader: channelsActionsHeader } = createTable("Canais");

    let warnings = { "30min": false, "15min": false, "5min": false, "1min": false };

    let isAdminPanelOpen = false;
    let usageInterval;

    window.addEventListener("beforeunload", () => {
        sessionStorage.removeItem("inputedPassword");
    });

    document.addEventListener('keydown', function(event) {
        const key = "*";
        if (event.key === key.toLowerCase() || event.key === key.toUpperCase()) {
            if (!isAdminPanelOpen) {
                const time = Math.max(0, maxUsageTime - GM_getValue("usageData").timeUsed);
                displaySessionEnd(time);
            } else {
                closeAdminPanelContainer();
                location.reload();
            }
        }
    });

    function getToday() {
        const today = new Date();
        today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
        return today.toISOString().split('T')[0];
    }

    function getAtualTimeInMilliseconds() {
        return Date.now();
    }

    function checkDisplayRemainingTime(remainingTimeInMinutes) {
        remainingTimeInMinutes = Math.round(remainingTimeInMinutes + 0.5);

        if (remainingTimeInMinutes <= 30 && remainingTimeInMinutes > 29 && !warnings["30min"]) {
            displayRemainingTime(30);
            warnings["30min"] = true;
        } else if (remainingTimeInMinutes <= 15 && remainingTimeInMinutes > 14 && !warnings["15min"]) {
            displayRemainingTime(15);
            warnings["15min"] = true;
        } else if (remainingTimeInMinutes <= 5 && remainingTimeInMinutes > 4 && !warnings["5min"]) {
            displayRemainingTime(5);
            warnings["5min"] = true;
        } else if (remainingTimeInMinutes <= 1 && remainingTimeInMinutes > 0 && !warnings["1min"]) {
            displayRemainingTime(1);
            warnings["1min"] = true;
        }
    }

    function getMinuteWord(time) {
        return time === 1 ? "minuto" : "minutos";
    }

    function displayRemainingTime(remainingTime) {
        const message = `${remainingTime} ${getMinuteWord(remainingTime)}`;

        const div = document.createElement("div");
        div.style.position = "fixed";
        div.style.top = "20px";
        div.style.left = "50%";
        div.style.transform = "translateX(-50%)";
        div.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
        div.style.color = "white";
        div.style.border = "2px solid rgba(255, 255, 255, 0.2)";
        div.style.borderRadius = "5px";
        div.style.padding = "10px";
        div.style.fontSize = "20px";
        div.style.opacity = "1";
        div.style.filter = "none";
        div.style.mixBlendMode = "normal";
        div.style.zIndex = "9999";
        div.textContent = message;

        document.body.appendChild(div);
        // Fecha o aviso após 7 segundos
        setTimeout(() => div.remove(), 7000);
    }

    function resetTimer(time = 0) {
        const today = getToday();
        const usageData = GM_getValue("usageData");

        if (!usageData || usageData.date !== today || time !== 0) {
            GM_setValue("usageData", {
                date: today,
                timeUsed: 0
            });

            const maxTime = time !== 0 ? time : 1;
            GM_setValue("maxUsageTime", maxTime);
            GM_setValue("startTime", Date.now());
            warnings = { "30min": false, "15min": false, "5min": false, "1min": false };
        }
    }

    function checkUsageTime() {
        resetTimer();


        if (isAdminPanelOpen) return;

        const usageData = GM_getValue("usageData");
        const startTime = GM_getValue("startTime");
        const currentTime = Date.now();

        const elapsedTimeInMinutes = (currentTime - startTime) / (60 * 1000);
        usageData.timeUsed = elapsedTimeInMinutes;
        GM_setValue("usageData", usageData);

        const remainingTimeInMinutes = maxUsageTime - usageData.timeUsed;

        checkDisplayRemainingTime(remainingTimeInMinutes);

        if (remainingTimeInMinutes <= 0 && !isAuthorizedContent()) {
            displaySessionEnd();
        }
    }

    function isAuthorizedContent() {
        const currentDomain = window.location.hostname
        if (currentDomain.includes("youtube.com")) {
            return isAuthorizedChannel();
        }
        return isAuthorizedSite();
    }

    function isAuthorizedSite() {
        const currentUrl = window.location.href;
        const allowed = GM_getValue("allowedSites");
        return allowed.some(site => currentUrl.includes(site));
    }

    function isAuthorizedChannel() {
        let channelName = getYoutubeChannelName();
        console.log("nome do canal: " + channelName);
        if (channelName) {
            console.log("nomesplit: " + allowedChannels.some(channel => channel === channelName));
            return allowedChannels.some(channel => channel === channelName);
        }
        return false;
    }

    function displaySessionEnd(time=0) {
        document.body.style.overflow = "hidden";
        document.querySelectorAll('video, audio').forEach(el => el.remove());
        displayAdminPanel(time);
    }

    function createLanHouseContainer() {
        const lanHouseContainer = document.createElement("div");

        Object.assign(lanHouseContainer.style, {
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: "30px 0",
            height: "300px",
            width: "500px",
            border: "2px solid black",
            borderRadius: "5px",
            padding: "20px",
            fontSize: "16px",
            backgroundColor: "#ddd",
            zIndex: "9999"
        });

        const lanText = document.createElement("h2");
        lanText.textContent = "Adicionar Tempo";
        lanText.fontSize = "20px";
        lanText.style.color = "black";
        lanText.style.margin = "0";
        lanHouseContainer.appendChild(lanText);

        const timeLabel = document.createElement("label");
        timeLabel.textContent = "Tempo: ";
        timeLabel.style.color = "black";
        timeLabel.style.backgroundColor = "";
        timeLabel.style.textShadow = "unset";
        timeLabel.style.fontSize = "14px";

        const timeInput = document.createElement("input");
        timeInput.placeholder = "Insira o tempo em minutos";
        timeInput.style.height = "30px";
        timeInput.style.width = "200px";
        timeInput.style.backgroundColor = "white";
        timeInput.style.color = "black";
        timeInput.style.border = "none";
        timeInput.style.borderRadius = "4px";
        timeInput.style.outline = "none";
        timeInput.style.fontSize = "14px";
        timeInput.style.padding = "2px 10px";

        const timeDiv = document.createElement("div");

        Object.assign(timeDiv.style, {
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: "0 10px",
        });

        timeDiv.appendChild(timeLabel);
        timeDiv.appendChild(timeInput);
        lanHouseContainer.appendChild(timeDiv)

        const submitButton = document.createElement("button");
        submitButton.textContent = "Confirmar";

        Object.assign(submitButton.style, {
            height: "30px",
            width: "200px",
            border: "1px solid black",
            borderRadius: "5px",
            backgroundColor: "green",
            color: "white",
            textAlign: "center",
            textShadow: "unset",
            fontSize: "14px",
            cursor: "pointer"
        });

        const cancelButton = document.createElement("button");
        cancelButton.textContent = "Cancelar";

        Object.assign(cancelButton.style, {
            height: "30px",
            width: "200px",
            border: "1px solid black",
            borderRadius: "5px",
            backgroundColor: "red",
            color: "white",
            textAlign: "center",
            textShadow: "unset",
            fontSize: "14px",
            cursor: "pointer"
        });

        const buttonsDiv = document.createElement("div");

        Object.assign(buttonsDiv.style, {
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: "0 10px",
        });

        buttonsDiv.appendChild(submitButton);
        buttonsDiv.appendChild(cancelButton);
        lanHouseContainer.appendChild(buttonsDiv);

        return { lanHouseContainer, timeInput, submitButton, cancelButton };
    }

    function createSolicitationContainer() {
        const solicitationContainer = document.createElement("div");

        Object.assign(solicitationContainer.style, {
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: "20px 0",
            width: "500px",
            border: "2px solid black",
            borderRadius: "5px",
            padding: "20px",
            fontSize: "16px",
            backgroundColor: "#ddd",
            color: "black",
        });

        const solicitationIncludeDiv = document.createElement("div");

        Object.assign(solicitationIncludeDiv.style, {
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: "10px 0",
        });

        const solicitationInfo = document.createElement("h2");
        solicitationInfo.textContent = "Este site não é permitido.";
        solicitationInfo.style.margin = "10px 0";
        solicitationInfo.style.color = "black";
        solicitationInfo.style.fontSize = "20px";
        solicitationIncludeDiv.appendChild(solicitationInfo);

        const solicitationText = document.createElement("p");
        solicitationText.textContent = "Deseja sugerir a inclusão dele na lista?";
        solicitationText.style.color = "black";
        solicitationText.style.fontSize = "16px";
        solicitationIncludeDiv.appendChild(solicitationText);

        const solicitationAcceptButton = document.createElement("button");
        solicitationAcceptButton.textContent = "Sim";

        Object.assign(solicitationAcceptButton.style, {
            height: "30px",
            width: "200px",
            border: "1px solid black",
            borderRadius: "5px",
            backgroundColor: "green",
            color: "white",
            textAlign: "center",
            textShadow: "unset",
            fontSize: "14px",
            cursor: "pointer"
        });

        const solicitationDenieButton = document.createElement("button");
        solicitationDenieButton.textContent = "Não";

        Object.assign(solicitationDenieButton.style, {
            height: "30px",
            width: "200px",
            border: "1px solid black",
            borderRadius: "5px",
            backgroundColor: "red",
            color: "white",
            textAlign: "center",
            textShadow: "unset",
            fontSize: "14px",
            cursor: "pointer"
        });

        const solicitationButtonsDiv = document.createElement("div");

        Object.assign(solicitationButtonsDiv.style, {
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: "0 10px",
        });

        solicitationButtonsDiv.appendChild(solicitationDenieButton);
        solicitationButtonsDiv.appendChild(solicitationAcceptButton);
        solicitationIncludeDiv.appendChild(solicitationButtonsDiv);
        solicitationContainer.appendChild(solicitationIncludeDiv);

        const currentDomain = window.location.hostname;
        const allowedSites = GM_getValue("allowedSites", []);
        const pendingSites = GM_getValue("pendingSites", []);
        const allowedChannels = GM_getValue("allowedChannels", []);
        const pendingChannels = GM_getValue("pendingChannels", []);
        const channelName = getYoutubeChannelName();

        if (pendingSites.includes(currentDomain) || pendingChannels.includes(channelName) || allowedSites.includes(currentDomain) || allowedChannels.includes(currentDomain)) {
            solicitationIncludeDiv.style.display = "none";
        }

        solicitationAcceptButton.addEventListener("click", () => {
            solicitationIncludeDiv.style.display = "none";

            const currentDomain = window.location.hostname;
            let pendingSites = GM_getValue("pendingSites", []);
            let pendingChannels = GM_getValue("pendingChannels", []);

            if (currentDomain.includes("youtube.com")) {
                let channelName = getYoutubeChannelName();

                if (channelName) {
                    pendingChannels.push(`${channelName}`);
                    GM_setValue("pendingChannels", pendingChannels);
                    location.reload();
                }
            } else {
                pendingSites.push(currentDomain);
                GM_setValue("pendingSites", pendingSites);
                location.reload();
            }
        });


        solicitationDenieButton.addEventListener("click", () => {
            solicitationIncludeDiv.style.display = "none";
        });

        return { solicitationContainer, solicitationAcceptButton, solicitationDenieButton };
    }

    function createAllowedContainer(table, textInfo, allowedTable, isSite) {
        const allowedContainer = document.createElement("div");

        Object.assign(allowedContainer.style, {
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: "10px 0",
            width: "100%"
        });

        const allowedInfo = document.createElement("h2");
        allowedInfo.textContent = `${textInfo}`;
        allowedInfo.style.margin = "0";
        allowedInfo.style.fontSize = "20px";
        allowedInfo.style.color = "black";

        renderAllowedTable(table, isSite);

        const tableDiv = document.createElement("div");
        tableDiv.style.width = "100%";
        tableDiv.style.height = "100px";
        tableDiv.style.overflow = "hidden auto";

        tableDiv.appendChild(allowedTable);
        allowedContainer.appendChild(allowedInfo);
        allowedContainer.appendChild(tableDiv);

        return { allowedContainer };
    }

    function createTable(title) {
        const table = document.createElement("table");
        table.style.borderCollapse = "collapse"; // Melhor aparência
        table.style.border = "1px solid #ddd";
        table.style.width = "100%";

        // Criar a linha do cabeçalho
        const headerRow = table.insertRow();

        // Criar células do cabeçalho
        const siteHeader = document.createElement("th");
        siteHeader.textContent = title;
        siteHeader.style.padding = "8px";
        siteHeader.style.border = "1px solid #ddd";

        const actionsHeader = document.createElement("th");
        actionsHeader.textContent = "Ações";
        actionsHeader.style.padding = "8px";
        actionsHeader.style.display = "none";
        actionsHeader.style.border = "1px solid #ddd";

        // Adicionar células à linha do cabeçalho
        headerRow.appendChild(siteHeader);
        headerRow.appendChild(actionsHeader);
        table.appendChild(headerRow);
        return { table, actionsHeader };
    }

    function getAvailableContent(isSite) {
        if (isSite) {
            return { available: allowedSites, pending: pendingSites };
        } else {
            return { available: allowedChannels, pending: pendingChannels };
        }
    }

    function setAllowedContent(content, isSite) {
        if (isSite) {
            GM_setValue("allowedSites", content);
        } else {
            GM_setValue("allowedChannels", content);
        }
    }

    function setPendingContent(content, isSite) {
        if (isSite) {
            GM_setValue("pendingSites", content);
        } else {
            GM_setValue("pendingChannels", content);
        }
    }

    function getAvailableContentActionsHeader(isSite) {
        return { actionsHeader: isSite ? sitesActionsHeader : channelsActionsHeader };
    }

    function addRow(table, site, isPending, isSite) {
        const row = table.insertRow();
        const siteCell = row.insertCell(0);
        const actionCell = row.insertCell(1);

        const link = document.createElement("a");
        link.href = site;
        link.textContent = site;
        link.target = "_blank";
        link.style.color = "rgba(0, 0, 0, 0.8)";
        link.style.fontSize = "14px";

        link.addEventListener("mouseover", () => {
            link.style.color = "black";
        });

        link.addEventListener("mouseout", () => {
            link.style.color = "rgba(0, 0, 0, 0.8)";
        });

        siteCell.appendChild(link);
        siteCell.style.padding = "8px";

        if (isPending) {
            siteCell.style.backgroundColor = "#ffcccc";
        } else {
            siteCell.style.backgroundColor = "#ccffcc";
        }

        const addButton = document.createElement("button");
        addButton.textContent = "✔️";
        addButton.style.display = "none";
        addButton.style.border = "none";
        addButton.style.backgroundColor = "transparent";
        addButton.style.color = "";
        addButton.style.cursor = "pointer";
        addButton.style.textShadow = "unset";
        addButton.style.fontSize = "16px";
        addButton.onclick = () => {
            const { available, pending } = getAvailableContent(isSite);
            available.push(site);
            pending.splice(pending.indexOf(site), 1);
            setAllowedContent(available, isSite);
            setPendingContent(pending, isSite);
            renderAllowedTable(table, isSite);
        };

        const removeButton = document.createElement("button");
        removeButton.textContent = "❌";
        removeButton.style.display = "none";
        removeButton.style.border = "none";
        removeButton.style.backgroundColor = "transparent";
        removeButton.style.color = "";
        removeButton.style.cursor = "pointer";
        removeButton.style.textShadow = "unset";
        removeButton.style.fontSize = "16px";
        removeButton.onclick = () => {
            const { available, pending } = getAvailableContent(isSite);
            if (isPending) {
                pending.splice(pending.indexOf(site), 1);
                setPendingContent(pending, isSite);
            } else {
                available.splice(available.indexOf(site), 1);
                setAllowedContent(available, isSite);
            }
            renderAllowedTable(table, isSite);
        };

        if (isPending) {
            actionCell.appendChild(addButton);
        }
        actionCell.appendChild(removeButton);
        actionCell.style.padding = "8px";

        const { actionsHeader } = getAvailableContentActionsHeader(isSite);

        if (isCorrectPassword(sessionStorage.getItem("inputedPassword"))) {
            actionsHeader.style.display = "inline-block";
            addButton.style.display = isPending ? "inline-block" : "none";
            removeButton.style.display = "inline-block";
        } else {
            actionsHeader.style.display = "none";
            addButton.style.display = "none";
            removeButton.style.display = "none";
        }
    }

    function renderAllowedTable(table, isSite) {
        const tds = table.getElementsByTagName("td");

        // Remover todas as células <td>
        while (tds.length > 0) {
            tds[0].parentNode.removeChild(tds[0]);
        }

        const { available, pending } = getAvailableContent(isSite);
        available.forEach(site => addRow(table, site, false, isSite));
        pending.forEach(site => addRow(table, site, true, isSite));
    }

    function displayAdminPanel(time) {
        isAdminPanelOpen = true;

        const adminPanelContainer = document.createElement("div");

        Object.assign(adminPanelContainer.style, {
            position: "fixed",
            left: "0",
            top: "0",
            transform: "traslate(-50%, -50%)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: "20px 0",
            height: "100%",
            width: "100%",
            border: "2px solid black",
            borderRadius: "5px",
            padding: "20px",
            fontSize: "16px",
            backgroundColor: "#1E1E1E",
            fontFamily: "Arial, sans-serif",
            color: "black",
            opacity: "1",
            filter: "none",
            mixBlendMode: "normal",
            overflow: "auto auto",
            zIndex: "9999999999999999"
        });

        const infoText = document.createElement("h2");
        const text = "Seu Tempo" + (time !== 0 ? `: ${Math.round(time + 0.5)} ${getMinuteWord(time)}!` : " Acabou!");
        infoText.textContent = text;
        infoText.style.color = "white";
        adminPanelContainer.appendChild(infoText);

        const adminPasswordDiv = document.createElement("div");

        Object.assign(adminPasswordDiv.style, {
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: "10px 0",
            border: "2px solid black",
            borderRadius: "5px",
            padding: "20px",
            fontSize: "16px",
            backgroundColor: "#ddd",
            color: "black",
        });

        const adminPasswordInfo = document.createElement("h3");
        adminPasswordInfo.textContent = "Senha do Administrador";
        adminPasswordDiv.appendChild(adminPasswordInfo);

        const adminPasswordInputDiv = document.createElement("div");

        Object.assign(adminPasswordInputDiv.style, {
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: "0 10px",
        });

        const passwordLabel = document.createElement("label");
        passwordLabel.textContent = "Senha: ";
        passwordLabel.style.color = "black";
        passwordLabel.style.backgroundColor = "";
        passwordLabel.style.textShadow = "unset";
        passwordLabel.style.fontSize = "14px";

        const passwordInput = document.createElement("input");
        passwordInput.placeholder = "Insira a senha";
        passwordInput.type = "password";
        passwordInput.style.height = "30px";
        passwordInput.style.width = "200px";
        passwordInput.style.backgroundColor = "white";
        passwordInput.style.color = "black";
        passwordInput.style.border = "none";
        passwordInput.style.borderRadius = "4px";
        passwordInput.style.outline = "none";
        passwordInput.style.fontSize = "14px";
        passwordInput.style.padding = "2px 10px";

        const passwordDiv = document.createElement("div");

        Object.assign(passwordDiv.style, {
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: "0 10px",
        });

        const passwordConfirmButton = document.createElement("button");
        passwordConfirmButton.textContent = "Confirmar";
        passwordConfirmButton.style.textShadow = "unset";

        Object.assign(passwordConfirmButton.style, {
            padding: "10px 20px",
            border: "1px solid black",
            borderRadius: "5px",
            backgroundColor: "green",
            color: "white",
            fontSize: "14px",
            textAlign: "center",
            cursor: "pointer"
        });

        passwordDiv.appendChild(passwordLabel);
        passwordDiv.appendChild(passwordInput);
        adminPasswordInputDiv.appendChild(passwordDiv);
        adminPasswordInputDiv.appendChild(passwordConfirmButton);
        adminPasswordDiv.appendChild(adminPasswordInputDiv);
        adminPanelContainer.appendChild(adminPasswordDiv);

        const { lanHouseContainer, timeInput, submitButton, cancelButton } = createLanHouseContainer();
        const { solicitationContainer, solicitationAcceptButton, solicitationDenieButton } = createSolicitationContainer();
        const { allowedContainer: allowedSitesContainer } = createAllowedContainer(allowedSitesTable, "Sites Permitidos/Pendentes", allowedSitesTable, true);
        const { allowedContainer: allowedChanellsContainer } = createAllowedContainer(allowedChannelsTable, "Canais Permitidos/Pendentes", allowedChannelsTable, false);

        const inputsDiv = document.createElement("div");

        Object.assign(inputsDiv.style, {
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: "30px 100px",
            color: "black",
        });

        solicitationContainer.appendChild(allowedSitesContainer);
        solicitationContainer.appendChild(allowedChanellsContainer);
        inputsDiv.appendChild(solicitationContainer);
        inputsDiv.appendChild(lanHouseContainer);
        adminPanelContainer.appendChild(inputsDiv);
        document.body.appendChild(adminPanelContainer);


        passwordConfirmButton.addEventListener("click", () => {
            const password = passwordInput.value;
            if (isCorrectPassword(password)) {
                sessionStorage.setItem("inputedPassword", password);
                adminPasswordDiv.style.display = "none";

                renderAllowedTable(allowedSitesTable, true);
                renderAllowedTable(allowedChannelsTable, false);
            } else {
                alert("A senha inserida está incorreta!");
                passwordInput.value = "";
            }
        });

        submitButton.addEventListener("click", () => {
            const time = timeInput.value;
            const password = sessionStorage.getItem("inputedPassword");

            renderAllowedTable(allowedSitesTable, true);
            renderAllowedTable(allowedChannelsTable, false);
            if (!password || !time) return;

            if (isCorrectPassword(password)) {
                alert(`Tempo resetado para ${time} ${getMinuteWord(time)}!`);
                resetTimer(time);
                closeAdminPanelContainer(adminPanelContainer);
                window.location.href = window.location.href;
            } else {
                alert("Primeiro faça login como Administrador!");
                passwordInput.value = "";
                timeInput.value = "";
            }
        });

        cancelButton.addEventListener("click", () => {
            window.location.href = "https://scratch.mit.edu";
            closeAdminPanelContainer(adminPanelContainer);
        });

    }

    function isCorrectPassword(password){
        return password === ADMIN_PASSWORD;
    }

    function closeAdminPanelContainer(adminPanelContainer=null) {
        sessionStorage.removeItem("inputedPassword");
        isAdminPanelOpen = false;
        if (adminPanelContainer) {
            document.body.removeChild(adminPanelContainer);
        }
    }

    function getYoutubeChannelName() {
        const currentUrl = window.location.href;
        let channelName = "";
        let channelElement;

        if (currentUrl.includes("youtube.com/@")){
            // modificar caso mude o local para encontrar o '(@<nome-canal>)' na main page do canal
            channelElement = document.querySelector(".yt-content-metadata-view-model-wiz__metadata-row .yt-core-attributed-string--link-inherit-color");

            if (channelElement) {
                channelName = channelElement.textContent.trim();
            }
        } else {
            // modificar  caso mude o local para encontrar o nome do canal na visualização de videos
            const channelElement = document.querySelector("yt-formatted-string a");

            if (channelElement) {
                channelName = channelElement.getAttribute("href").replace("/", "");
            }
        }

        return channelName;
    }

    function startUsageInterval() {
        usageInterval = setInterval(() => {
            if (document.visibilityState !== "visible") {
                return;
            }
            checkUsageTime();
        }, VERIFICATION_TIME * 1000);
    }

    function stopUsageInterval() {
        clearInterval(usageInterval);
    }

    startUsageInterval();
})();

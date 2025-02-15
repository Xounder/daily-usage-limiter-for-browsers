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
    const VERIFICATION_TIME = 2;
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
    const mainLinkYoutube = "https://www.youtube.com/";

    const { table: allowedSitesTable, actionsHeader: sitesActionsHeader } = createTable("Sites");
    const { table: allowedChannelsTable, actionsHeader: channelsActionsHeader } = createTable("Canais");

    let warnings = { "30min": false, "15min": false, "5min": false, "1min": false };

    let isAdminPanelOpen = false;
    let isAdmin = false;
    let usageInterval;

    window.addEventListener("beforeunload", () => {
        sessionStorage.removeItem("inputedPassword");
    });

    document.addEventListener('keydown', function(event) {
        const openCloseAdminPanelKey = "*";
        if (event.key === openCloseAdminPanelKey.toLowerCase() || event.key === openCloseAdminPanelKey.toUpperCase()) {
            if (!isAdminPanelOpen) {
                const remainingTime = getRemainingTime();
                const infoTextContent =  remainingTime !== 0 ? `Tempo Restante: ${getRoundedTime(time)} ${getMinuteWord(time)}!` : "Sessão Expirada!";
                endUserSession(infoTextContent);
            } else {
                closeAdminPanelContainer();
                location.reload();
            }
        }

        const showAdminContentKey = "p";
        if (
            (event.key.toLowerCase() === showAdminContentKey && event.shiftKey) ||
            (event.key.toUpperCase() === showAdminContentKey && event.shiftKey)
        ) {
            if (!isAdminPanelOpen || isAdmin) return;

            isAdmin = true;
            endUserSession("Admin Mode");
        }

        const showRemainingTimeKey = "t";
        if (
            (event.key.toLowerCase() === showRemainingTimeKey && event.shiftKey) ||
            (event.key.toUpperCase() === showRemainingTimeKey && event.shiftKey)
        ) {
            const remainingTime = getRoundedTime(getRemainingTime());
            displayRemainingTime(remainingTime, false);
        }
    });

    // Getters & Setters

    function getRemainingTime() {
        return Math.max(0, maxUsageTime - GM_getValue("usageData").timeUsed);
    }

    function getRoundedTime(time) {
        return Math.round(time + 0.5);
    }

    function getToday() {
        const today = new Date();
        today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
        return today.toISOString().split('T')[0];
    }

    function getAtualTimeInMilliseconds() {
        return Date.now();
    }

    function getMinuteWord(time) {
        return time === 1 ? "minuto" : "minutos";
    }

    function getAvailableContent(isSite) {
        if (isSite) {
            return { available: allowedSites, pending: pendingSites };
        } else {
            return { available: allowedChannels, pending: pendingChannels };
        }
    }

    function getAvailableContentActionsHeader(isSite) {
        return { actionsHeader: isSite ? sitesActionsHeader : channelsActionsHeader };
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

    function setAllowedContent(allowedList, isSite) {
        if (isSite) {
            GM_setValue("allowedSites", allowedList);
        } else {
            GM_setValue("allowedChannels", allowedList);
        }
    }

    function setPendingContent(pendingList, isSite) {
        if (isSite) {
            GM_setValue("pendingSites", pendingList);
        } else {
            GM_setValue("pendingChannels", pendingList);
        }
    }

    // Create Html/Css

    function addRow(table, site, isPending, isSite) {
        if (isPending && !isAdmin) return;

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

        actionCell.style.display = "flex";
        actionCell.style.gap = "0 4px";
        actionCell.style.justifyContent = "center";
        actionCell.style.alignItems = "center";

        const addButton = document.createElement("button");
        addButton.textContent = "✔️";
        addButton.style.display = "none";
        addButton.style.border = "none";
        addButton.style.backgroundColor = "transparent";
        addButton.style.color = "";
        addButton.style.cursor = "pointer";
        addButton.style.textShadow = "unset";
        addButton.style.fontSize = "14px";
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
        removeButton.style.fontSize = "14px";
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

    function createAdminPasswordContainers() {
        const adminPasswordDiv = document.createElement("div");
        Object.assign(adminPasswordDiv.style, {
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: "10px 0",
            width: "385px",
            height: "115px",
            border: "1px solid rgba(0, 0, 0, 0.3)",
            borderRadius: "2px",
            padding: "20px",
            fontSize: "16px",
            backgroundColor: "#F5F5F5",
            color: "black",
        });

        const { h2: adminPasswordInfo } = createH2("Senha do Administrador", "0");
        adminPasswordDiv.appendChild(adminPasswordInfo);

        const { div: adminPasswordInputDiv } = createDiv("row", "0 10px");
        const { div: passwordDiv } = createDiv("row", "0 10px");
        const { label: passwordLabel } = createLabel("Senha:");
        const { input: passwordInput } = createInput("Insira a senha", "200px", "30px", "password");
        const { button: passwordConfirmButton } = createButton("Confirmar", "100px", "40px", "#00533C", "#004B36")

        passwordDiv.appendChild(passwordLabel);
        passwordDiv.appendChild(passwordInput);
        adminPasswordInputDiv.appendChild(passwordDiv);
        adminPasswordInputDiv.appendChild(passwordConfirmButton);
        adminPasswordDiv.appendChild(adminPasswordInputDiv);

        passwordConfirmButton.addEventListener("click", () => {
            const password = passwordInput.value;
            if (isCorrectPassword(password)) {
                showAlert("Login realizado com sucesso!");
                sessionStorage.setItem("inputedPassword", password);
                adminPasswordDiv.style.display = "none";

                renderAllowedTable(allowedSitesTable, true);
                renderAllowedTable(allowedChannelsTable, false);
            } else {
                if (password){
                    showAlert("A senha inserida está incorreta!");
                    passwordInput.value = "";
                } else {
                    showAlert("Insira a senha antes de confimar!");
                }
            }
        });

        return { adminPasswordDiv, passwordInput};
    }

    function createLanHouseContainer(adminPanelContainer, passwordInput) {
        const lanHouseContainer = document.createElement("div");
        Object.assign(lanHouseContainer.style, {
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: "30px 0",
            height: "200px",
            width: "385px",
            height: "200px",
            border: "1px solid rgba(0, 0, 0, 0.3)",
            borderRadius: "2px",
            padding: "20px",
            fontSize: "16px",
            backgroundColor: "#F5F5F5",
        });

        const { h2: lanText } = createH2("Definir o Tempo de uso", "0");
        lanHouseContainer.appendChild(lanText);

        const { label: timeLabel } = createLabel("Tempo:");
        const { input: timeInput } = createInput("minutos", "90px", "30px", "number");
        const { div: timeDiv } = createDiv("row", "0 10px");

        timeDiv.appendChild(timeLabel);
        timeDiv.appendChild(timeInput);
        lanHouseContainer.appendChild(timeDiv)

        const { button: submitButton } = createButton("Confirmar", "150px", "30px", "#00533C", "#004B36")
        const { button: cancelButton } = createButton("Cancelar", "150px", "30px", "#7E1E38", "#67192E")
        const { div: buttonsDiv } = createDiv("row", "0 10px");

        buttonsDiv.appendChild(submitButton);
        buttonsDiv.appendChild(cancelButton);
        lanHouseContainer.appendChild(buttonsDiv);

        submitButton.addEventListener("click", () => {
            const time = timeInput.value;
            const password = sessionStorage.getItem("inputedPassword");

            if (!password) {
                showAlert("Primeiro faça login como Administrador!")
                return;
            }

            if (!time) {
                showAlert("Insira o tempo em minutos que deseja definir!");
                return;
            }

            if (isCorrectPassword(password)) {
                showAlert(`Tempo definido para ${time} ${getMinuteWord(parseInt(time))}!`);
                resetTimer(time);
                closeAdminPanelContainer(adminPanelContainer);
                window.location.href = window.location.href;
            } else {
                showAlert("Somente Administradores podem definir o tempo!");
                passwordInput.value = "";
                timeInput.value = "";
            }
        });

        cancelButton.addEventListener("click", () => {
            window.location.href = "https://scratch.mit.edu";
            closeAdminPanelContainer(adminPanelContainer);
        });

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
            width: "800px",
            minHeight: "345px",
            maxHeigth: "345px",
            border: "1px solid rgba(0, 0, 0, 0.3)",
            borderRadius: "2px",
            padding: "20px",
            fontSize: "16px",
            backgroundColor: "#F5F5F5",
            color: "black",
        });

        const { div: solicitationIncludeDiv } = createDiv("column", "10px 0");
        const { h2: solicitationInfo } = createH2("Este site não é permitido", "10px 0");
        solicitationIncludeDiv.appendChild(solicitationInfo);

        const solicitationText = document.createElement("p");
        solicitationText.textContent = "Deseja sugerir a inclusão dele na lista?";
        solicitationText.style.color = "black";
        solicitationText.style.fontSize = "16px";
        solicitationText.style.margin = "0";
        solicitationIncludeDiv.appendChild(solicitationText);

        const { button: solicitationAcceptButton } = createButton("Sim", "200px", "30px", "#00533C", "#004B36")
        const { button: solicitationDenieButton } = createButton("Não", "200px", "30px", "#7E1E38", "#67192E")
        const { div: solicitationButtonsDiv } = createDiv("row", "0 10px");

        solicitationButtonsDiv.appendChild(solicitationDenieButton);
        solicitationButtonsDiv.appendChild(solicitationAcceptButton);
        solicitationIncludeDiv.appendChild(solicitationButtonsDiv);
        solicitationContainer.appendChild(solicitationIncludeDiv);

        const currentDomain = window.location.origin;
        const channelName = getYoutubeChannelName();

        if (pendingSites.includes(currentDomain) || pendingChannels.includes(channelName) || allowedSites.includes(currentDomain) || allowedChannels.includes(currentDomain) || isMainLinkYoutube()) {
            solicitationIncludeDiv.style.display = "none";
        }

        solicitationAcceptButton.addEventListener("click", () => {
            solicitationIncludeDiv.style.display = "none";

            if (currentDomain.includes("youtube.com")) {
                const channelName = getYoutubeChannelName();

                if (channelName) {
                    pendingChannels.push(`${channelName}`);
                    setPendingContent(pendingChannels, false);
                    showAlert("Sua solicitação foi enviada com sucesso!");
                }
            } else {
                pendingSites.push(currentDomain);
                setPendingContent(pendingSites, true);
                showAlert("Sua solicitação foi enviada com sucesso!");
            }
        });

        solicitationDenieButton.addEventListener("click", () => {
            solicitationIncludeDiv.style.display = "none";
        });

        return { solicitationContainer, solicitationIncludeDiv, solicitationAcceptButton, solicitationDenieButton };
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

        const { h2: allowedInfo } = createH2(`${textInfo}`, "0");

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
        table.style.borderCollapse = "collapse";
        table.style.border = "1px solid #ddd";
        table.style.width = "100%";

        const headerRow = table.insertRow();

        const siteHeader = document.createElement("th");
        siteHeader.textContent = title;
        siteHeader.style.color = "white";
        siteHeader.style.backgroundColor = "#04AA6D";
        siteHeader.style.padding = "8px";
        siteHeader.style.border = "1px solid #ddd";
        
        
        const actionsHeader = document.createElement("th");
        actionsHeader.textContent = "Ações";
        actionsHeader.style.color = "white";
        actionsHeader.style.backgroundColor = "#04AA6D";
        actionsHeader.style.width = "100%";
        actionsHeader.style.padding = "8px";
        actionsHeader.style.display = "none";
        actionsHeader.style.border = "1px solid #ddd";

        headerRow.appendChild(siteHeader);
        headerRow.appendChild(actionsHeader);
        table.appendChild(headerRow);
        return { table, actionsHeader };
    }

    function createButton(textContent, width, height, backgroundColor, backgrouncColorhover) {
        const button = document.createElement("button");
        button.textContent = `${textContent}`;
        button.style.textShadow = "unset";

        Object.assign(button.style, {
            fontFamily: "Gill Sans, sans-serif",
            height: `${height}`,
            width: `${width}`,
            border: "none",
            borderRadius: "2px",
            backgroundColor: `${backgroundColor}`,
            color: "white",
            fontSize: "14px",
            textAlign: "center",
            cursor: "pointer"
        });

        button.onmouseover = () => {
            button.style.backgroundColor = `${backgrouncColorhover}`;
        }

        button.onmouseout = () => {
            button.style.backgroundColor = `${backgroundColor}`;
        }

        return { button };
    }

    function createDiv(flexDirection, gap) {
        const div = document.createElement("div");

        Object.assign(div.style, {
            display: "flex",
            flexDirection: `${flexDirection}`,
            justifyContent: "center",
            alignItems: "center",
            gap: `${gap}`,
        });

        return { div };
    }

    function createInput(placeholder, width, height, type) {
        const input = document.createElement("input");
        input.placeholder = `${placeholder}`;
        input.type = `${type}`;

        Object.assign(input.style, {
            height: `${height}`,
            width: `${width}`,
            backgroundColor: "white",
            color: "black",
            border: "1px solid rgba(0, 0, 0, 0.3)",
            borderRadius: "4px",
            outline: "none",
            fontSize: "14px",
            padding: "2px 10px"
        });
        return { input };
    }

    function createH2(textContent, margin, fontSize="20px", color="black"){
        const h2 = document.createElement("h2");
        h2.textContent = `${textContent}`;
        h2.style.fontSize = `${fontSize}`;
        h2.style.color = `${color}`;
        h2.style.margin = `${margin}`;
        return { h2 };
    }

    function createLabel(textContent){
        const label = document.createElement("label");
        label.textContent = `${textContent}`;
        label.style.color = "black";
        label.style.backgroundColor = "";
        label.style.textShadow = "unset";
        label.style.fontSize = "14px";
        return { label };
    }

    // Render/Display

    function displayRemainingTime(remainingTime) {
        const message = `${remainingTime} ${getMinuteWord(remainingTime)}`;
        const div = document.createElement("div");
        div.textContent = message;

        Object.assign(div.style, {
            position: "fixed",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            color: "white",
            border: "2px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "5px",
            padding: "10px",
            fontSize: "20px",
            opacity: "1",
            filter: "none",
            mixBlendMode: "normal",
            zIndex: "99999999999999999999999999999999",
        });

        document.body.appendChild(div);
        setTimeout(() => div.remove(), 7000);
    }

    function showAlert(message) {
        const div = document.createElement("div");
        div.textContent = message;

        Object.assign(div.style, {
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "rgba(0, 0, 0, 1)",
            color: "white",
            border: "2px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "5px",
            padding: "20px",
            fontSize: "20px",
            opacity: "1",
            filter: "none",
            mixBlendMode: "normal",
            zIndex: "99999999999999999999999999999999",
        });

        document.body.appendChild(div);
        setTimeout(() => div.remove(), 2000);
    }

    function renderAllowedTable(table, isSite) {
        const tds = table.getElementsByTagName("td");

        while (tds.length > 0) {
            tds[0].parentNode.removeChild(tds[0]);
        }

        const { available, pending } = getAvailableContent(isSite);
        available.forEach(site => addRow(table, site, false, isSite));
        pending.forEach(site => addRow(table, site, true, isSite));
    }

    function renderAdminPanel(infoTextContent) {
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
            fontFamily: "Gill Sans, sans-serif",
            color: "black",
            opacity: "1",
            filter: "none",
            mixBlendMode: "normal",
            overflow: "auto auto",
            zIndex: "9999999999999999"
        });

        const { h2: infoText } = createH2(infoTextContent, "0", "24px", "white");
        adminPanelContainer.appendChild(infoText);

        const { adminPasswordDiv, passwordInput } = createAdminPasswordContainers();
        const { lanHouseContainer } = createLanHouseContainer(adminPanelContainer, passwordInput);
        const { solicitationContainer } = createSolicitationContainer();

        const allowedTextContent = "Permitidos" + (isAdmin ? " /Pendentes" : "" ) + ":";
        const { allowedContainer: allowedSitesContainer } = createAllowedContainer(allowedSitesTable, `Sites ${allowedTextContent}`, allowedSitesTable, true);
        const { allowedContainer: allowedChanellsContainer } = createAllowedContainer(allowedChannelsTable, `Canais ${allowedTextContent}`, allowedChannelsTable, false);

        const { div: inputsDiv } = createDiv("row", "30px 10px");

        const { div: adminDiv } = createDiv("column", "30px 10px");
        adminDiv.appendChild(adminPasswordDiv);
        adminDiv.appendChild(lanHouseContainer);

        const {div: allowedDiv } = createDiv("row", "30px 10px");
        allowedDiv.style.width = "100%"
        allowedSitesContainer.style.flex = "1";
        allowedChanellsContainer.style.flex = "1";

        allowedDiv.appendChild(allowedSitesContainer);
        allowedDiv.appendChild(allowedChanellsContainer);
        solicitationContainer.appendChild(allowedDiv);
        inputsDiv.appendChild(solicitationContainer);
        inputsDiv.appendChild(adminDiv);

        lanHouseContainer.style.display = "none";
        adminPasswordDiv.style.display = "none";

        if (isAdmin) {
            lanHouseContainer.style.display = "flex";
            adminPasswordDiv.style.display = "flex";
        }

        adminPanelContainer.appendChild(inputsDiv);
        document.body.appendChild(adminPanelContainer);
    }

    // Verifications

    function isAuthorizedContent() {
        const currentDomain = window.location.hostname
        if (currentDomain.includes("youtube.com")) {
            if (isMainLinkYoutube()) {
                return false;
            }
            return isAuthorizedChannel();
        }
        return isAuthorizedSite();
    }

    function isAuthorizedSite() {       
        if (window.self !== window.top) // iframes             
            return true;
                    
        const currentUrl = window.location.hostname;
        return allowedSites.some(site => site.includes(currentUrl));
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

    function isCorrectPassword(password){
        return password === ADMIN_PASSWORD;
    }

    function isMainLinkYoutube(){
        return window.location.href === mainLinkYoutube;
    }

    // Scripts

    function endUserSession(infoTextContent) {
        document.body.style.overflow = "hidden";
        document.querySelectorAll('video, audio').forEach(el => el.pause());
        document.querySelectorAll('video, audio').forEach(el => el.remove());
        renderAdminPanel(infoTextContent);
    }

    function checkDisplayRemainingTime(remainingTimeInMinutes) {
        remainingTimeInMinutes = getRoundedTime(remainingTimeInMinutes);

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

    function checkUsageTime() {
        resetTimer();

        if (isAdminPanelOpen){
            return;
        } else {
            isAdmin = false;
        }

        const usageData = GM_getValue("usageData");
        const startTime = GM_getValue("startTime");
        const currentTime = getAtualTimeInMilliseconds();

        const elapsedTimeInMinutes = (currentTime - startTime) / (60 * 1000);
        usageData.timeUsed = elapsedTimeInMinutes;
        GM_setValue("usageData", usageData);

        const remainingTimeInMinutes = maxUsageTime - usageData.timeUsed;

        checkDisplayRemainingTime(remainingTimeInMinutes);

        if (remainingTimeInMinutes <= 0 && !isAuthorizedContent()) {
            endUserSession("Sessão Expirada!");
        }
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
            GM_setValue("startTime", getAtualTimeInMilliseconds());
            warnings = { "30min": false, "15min": false, "5min": false, "1min": false };
        }
    }

    function closeAdminPanelContainer(adminPanelContainer=null) {
        sessionStorage.removeItem("inputedPassword");
        isAdminPanelOpen = false;
        if (adminPanelContainer) {
            document.body.removeChild(adminPanelContainer);
        }
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

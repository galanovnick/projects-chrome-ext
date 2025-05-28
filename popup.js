(function() {
    document.getElementById("create").addEventListener("click", onCreateClick);

    const projectNameInput = document.getElementById("project-name");
    const taskNamesInput = document.getElementById("task-names");
    const projectsAutocomplete = document.getElementById("projects");
    const messageContainer = document.getElementById("message-outlet");

    (async function () {
        populateProjectsAutocomplete(await getCurrentTabId());
    })();

    async function onCreateClick() {
        const tabId = await getCurrentTabId();

        const projectName = projectNameInput.value.trim();
        let taskNames;

        try {
            taskNames = JSON.parse(taskNamesInput.value.trim() || "[]");
        } catch {
            showMessage("Task names JS array JSON is invalid");
            return;
        }

        if (!projectName) {
            showMessage("Project/Area name is required");
            return;
        }

        if (!taskNames?.length) {
            showMessage("Task names are empty");
            return;
        }

        taskNamesInput.value = "";

        await chrome.scripting
            .executeScript({
                target: {tabId},
                func: setParameters,
                args: [projectName, taskNames]
            });

        chrome.scripting
            .executeScript({
                target: {tabId},
                files: ['create.js'],
            });
    }

    function setParameters(projectName, taskNames) {
        window.__projectsExtProjectName = projectName;
        window.__projectsExtTaskNames = taskNames;
    }

    async function getCurrentTabId() {
        const queryOptions = {
            active: true,
            lastFocusedWindow: true
        };
        // `tab` will either be a `tabs.Tab` instance or `undefined`.
        const [tab] = await chrome.tabs.query(queryOptions);
        return tab?.id;
    }

    async function populateProjectsAutocomplete(tabId, attemptCount = 0) {
        if (attemptCount >= 25) {
            return;
        }

        const execResult = await getProjectsNames(tabId);
        const names = execResult?.[0]?.result || [];

        if (!names.length) {
            setTimeout(() => populateProjectsAutocomplete(tabId, attemptCount + 1), 1000);
            return;
        }

        names.forEach(name => {
            const nameOption = document.createElement("option");
            nameOption.innerHTML = name;
            projectsAutocomplete.appendChild(nameOption);
        });
    }

    async function getProjectsNames(tabId) {
        return await chrome.scripting.executeScript({
            target: { tabId: tabId },
            world: "MAIN", // access Projects global variables
            func: getNames
        });
    }

    function getNames() {
        const areIdToName = {};

        window.app?.Areas?.models?.forEach(item => {
            areIdToName[item.attributes.id] = item.attributes.name;
        });

        const projectNames = window.app?.Projects?.models?.map(item => {
            const areaName = areIdToName[item.attributes.areaId];
            const projectName = item.attributes.fullName;

            return areaName ? `${areaName}: ${projectName}` : projectName;
        });


        return [
            ...Object.values(areIdToName),
            ...projectNames
        ];
    }

    function showMessage(message) {
        messageContainer.parentElement.removeAttribute("hidden");
        messageContainer.innerText = message;
    }
})();

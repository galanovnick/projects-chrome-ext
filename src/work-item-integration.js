(function () {
    const body = document.querySelector("body");
    const githubTokenInput = document.getElementById("github-token");
    const azureTokenInput = document.getElementById("azure-token");
    const searchButton = document.getElementById("github-search");
    const messageContainer = document.getElementById("message-outlet");
    const closeMessageButton = document.getElementById("close-warning");
    const preview = document.getElementById("github-preview");
    const taskNames = document.getElementById("task-names");

    searchButton.addEventListener("click", onSearchClick);
    closeMessageButton.addEventListener("click", hideMessage);

    const ORG = "europadx";
    const PROJECT = "europadx";

    function onSearchClick() {
        const githubToken = githubTokenInput.value;
        const azureToken = azureTokenInput.value;

        if (!githubToken && !azureToken) {
            showMessage("Cannot lookup PR names without at least one token");
            return;
        }

        setLoading(true);

        Promise.all([searchGithub(githubToken), searchAzure(azureToken)])
            .finally(() => setLoading(false))
            .then(([githubRes, azureRes]) => setSearchPreview(githubRes, azureRes))
            .catch(err => {
                console.error(err);
                showMessage("Failed to get PR names. Check tokens.");
            });


    }

    let selected = {};

    function setSearchPreview(githubResponse, azureResponse) {
        preview.innerHTML = "";

        const groupedByRepo = {...githubResponse, ...azureResponse};

        if (!Object.keys(groupedByRepo).length) {
            showMessage("No PR found");
            return;
        }

        selected = {...groupedByRepo};

        Object.keys(groupedByRepo).forEach(repo => {
            const label = document.createElement("label");
            const formattedRepoLabel = repo.replace("https://api.github.com/repos/", "");
            label.innerText = `${formattedRepoLabel} (${groupedByRepo[repo].length} PR's)`;
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = true;

            const container = document.createElement("div");
            container.classList.add("checkbox-wrapper");
            container.appendChild(label);
            container.appendChild(checkbox);

            checkbox.addEventListener("change", e => onSelectRepoClick(e, repo, groupedByRepo[repo]));

            preview.prepend(container);
        });

        const button = document.createElement("button");
        button.innerText = "Add selected PR's to the box below";
        button.addEventListener("click", onPreviewSelectedClick);
        preview.append(button);

        preview.removeAttribute("hidden");
    }

    function onSelectRepoClick(event, repo, values) {
        if (selected[repo]) {
            delete selected[repo];
        } else {
            selected[repo] = values;
        }
    }

    function onPreviewSelectedClick() {
        taskNames.value = JSON.stringify(
            Object.values(selected).reduce((result, values) => result.concat(values), [])
        ).split(",").join(",\n  ")
            .replace("[", "[\n  ")
            .replace("]", "\n]");
    }

    function setLoading(loading) {
        if (loading) {
            body.classList.add("loading");
        } else {
            body.classList.remove("loading");
        }
    }

    async function searchGithub(token) {
        if (!token) {
            return {};
        }

        const username = await getUserName(token);

        const previousMonth = getFromDate();

        const encodedQuery = `is:pr+author:${username}+created:>${previousMonth}`;
        const url = `https://api.github.com/search/issues?q=${encodedQuery}&per_page=100&sort=created&scope=repo`;
        return fetch(url, {
            method: "GET",
            headers: {
                Accept: "application/vnd.github+json",
                Authorization: `Bearer ${token}`,
                "X-GitHub-Api-Version": "2022-11-28"
            }
        }).then(r => r.json())
            .then(response => {
                const groupedByRepo = {};
                response.items.forEach((item) => {
                    groupedByRepo[item.repository_url] = groupedByRepo[item.repository_url] || [];
                    groupedByRepo[item.repository_url].push(item.title);
                });
                return groupedByRepo;
            })
    }

    function getUserName(token) {
        const url = `https://api.github.com/user`;

        return fetch(url, {
            method: "GET",
            headers: {
                Accept: "application/vnd.github+json",
                Authorization: `Bearer ${token}`,
                "X-GitHub-Api-Version": "2022-11-28"
            }
        }).then(r => r.json())
            .then(r => r.login);
    }

    async function searchAzure(token) {
        if (!token) {
            return {};
        }

        const fromDate = getFromDate();

        const userEmail = await getCurrentUserEmail(token);

        // Azure DevOps API URL for pull requests
        const url = `https://dev.azure.com/${ORG}/${PROJECT}/_apis/git/pullrequests?searchCriteria.status=all&searchCriteria.minTime=${fromDate}&api-version=7.1`;

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Basic " + btoa(":" + token)
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Filter pull requests to only include those created by the current user
        const filteredPRs = data.value.filter(pr => pr.createdBy.uniqueName === userEmail);

        // Map the response to a format similar to GitHub's
        return filteredPRs.reduce((res, pr) => {
            res[pr.repository.name] = res[pr.repository.name] || [];
            res[pr.repository.name].push(pr.title);
            return res;
        }, {});
    }

    async function getCurrentUserEmail(pat) {
        const credentials = btoa(`:${pat}`);
        const headers = {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json'
        };

        const url = `https://vssps.dev.azure.com/${ORG}/_apis/profile/profiles/me?api-version=7.1`;

        try {
            const response = await fetch(url, { headers });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.emailAddress;
        } catch (error) {
            console.error('Error fetching current user ID:', error);
            throw error;
        }
    }

    function showMessage(message) {
        messageContainer.parentElement.removeAttribute("hidden");
        messageContainer.innerText = message;
    }

    function hideMessage() {
        messageContainer.parentElement.setAttribute("hidden", true);
    }

    function getFromDate() {
        const currentDate = new Date();
        const previousMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);

        const year = previousMonthDate.getFullYear();
        const month = String(previousMonthDate.getMonth() + 1).padStart(2, "0");
        const day = String(previousMonthDate.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }
})();

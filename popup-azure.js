(function () {
    const body = document.querySelector("body");
    const tokenInput = document.getElementById("azure-token");
    const searchButton = document.getElementById("azure-search");
    const messageContainer = document.getElementById("message-outlet");
    const closeMessageButton = document.getElementById("close-warning");
    const preview = document.getElementById("github-preview"); // Reuse the same preview container
    const taskNames = document.getElementById("task-names");

    // Azure DevOps organization and project name
    const organization = "europadx";
    const project = "europadx"; // Hardcoded as per requirements

    searchButton.addEventListener("click", onSearchClick);
    closeMessageButton.addEventListener("click", hideMessage);

    function onSearchClick() {
        const token = tokenInput.value;

        if (!token) {
            showMessage("Cannot lookup Azure DevOps without token");
            return;
        }

        setLoading(true);

        searchAzurePullRequests(token)
            .finally(() => setLoading(false))
            .then(response => setAzureSearchPreview(response))
            .catch(err => {
                console.error(err);
                showMessage("Failed to get PR names from Azure DevOps");
            });
    }

    let selected = {};

    function setAzureSearchPreview(response) {
        preview.innerHTML = "";

        if (!response || !response.length) {
            showMessage("No PR found");
            return;
        }

        // Group by repository
        const groupedByRepo = {};
        response.forEach((item) => {
            const repoName = item.repository;
            groupedByRepo[repoName] = groupedByRepo[repoName] || [];
            groupedByRepo[repoName].push(item.title);
        });
        selected = {...groupedByRepo};

        Object.keys(groupedByRepo).forEach(repo => {
            const label = document.createElement("label");
            label.innerText = `${repo} (${groupedByRepo[repo].length} PR's)`;
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
        ).split(",").join(",\n")
            .replace("[", "[\n");
    }

    function setLoading(loading) {
        if (loading) {
            body.classList.add("loading");
        } else {
            body.classList.remove("loading");
        }
    }

    async function searchAzurePullRequests(token) {
        // Get the current date and date from 1 month ago
        const currentDate = new Date();
        const previousMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, currentDate.getDate());

        // Format dates for Azure DevOps API
        const fromDate = previousMonthDate.toISOString();

        // First, get the current user's information
        const userUrl = `https://vssps.dev.azure.com/${organization}/_apis/profile/profiles/me?api-version=6.0`;
        const userResponse = await fetch(userUrl, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Basic " + btoa(":" + token)
            }
        });

        if (!userResponse.ok) {
            throw new Error(`HTTP error! status: ${userResponse.status}`);
        }

        const userData = await userResponse.json();
        const currentUserId = userData.id;

        // Azure DevOps API URL for pull requests
        const url = `https://dev.azure.com/${organization}/${project}/_apis/git/pullrequests?searchCriteria.status=all&searchCriteria.createdAfter=${fromDate}&api-version=6.0`;

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
        const filteredPRs = data.value.filter(pr => pr.createdBy.id === currentUserId);

        // Map the response to a format similar to GitHub's
        return filteredPRs.map(pr => ({
            repository: pr.repository.name,
            title: pr.title
        }));
    }


    function showMessage(message) {
        messageContainer.parentElement.removeAttribute("hidden");
        messageContainer.innerText = message;
    }

    function hideMessage() {
        messageContainer.parentElement.setAttribute("hidden", true);
    }

})();

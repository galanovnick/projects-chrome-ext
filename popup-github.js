(function () {
    const body = document.querySelector("body");
    const tokenInput = document.getElementById("github-token");
    const searchButton = document.getElementById("github-search");
    const messageContainer = document.getElementById("message-outlet");
    const closeMessageButton = document.getElementById("close-warning");
    const preview = document.getElementById("github-preview");
    const taskNames = document.getElementById("task-names");

    searchButton.addEventListener("click", onSearchClick);
    closeMessageButton.addEventListener("click", hideMessage);

    function onSearchClick() {
        const token = tokenInput.value;

        if (!token) {
            showMessage("Cannot lookup PR names without token");
            return;
        }

        setLoading(true);

        searchGithub(token)
            .finally(() => setLoading(false))
            .then(response => setGithubSearchPreview(response))
            .catch(err => {
                console.error(err);
                showMessage("Failed to get PR names from GitHub");
            });
    }

    let selected = {};

    function setGithubSearchPreview(response) {
        preview.innerHTML = "";

        if (!response.items.length) {
            showMessage("No PR found");
            return;
        }

        const groupedByRepo = {};
        response.items.forEach((item) => {
            groupedByRepo[item.repository_url] = groupedByRepo[item.repository_url] || [];
            groupedByRepo[item.repository_url].push(item.title);
        });
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

    async function searchGithub(token) {
        const username = await getUserName(token);

        const currentDate = new Date();
        const previousMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 0);
        const previousMonth = previousMonthDate.toISOString().split("T")[0];

        const encodedQuery = `is:pr+author:${username}+created:>${previousMonth}`;
        const url = `https://api.github.com/search/issues?q=${encodedQuery}&per_page=100&sort=created&scope=repo`;
        return fetch(url, {
            method: "GET",
            headers: {
                Accept: "application/vnd.github+json",
                Authorization: `Bearer ${token}`,
                "X-GitHub-Api-Version": "2022-11-28"
            }
        }).then(r => r.json());
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

    function showMessage(message) {
        messageContainer.parentElement.removeAttribute("hidden");
        messageContainer.innerText = message;
    }

    function hideMessage() {
        messageContainer.parentElement.setAttribute("hidden", true);
    }

})();

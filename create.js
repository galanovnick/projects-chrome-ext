(function () {
    const CREATE_TASK_BUTTON_SELECTOR = ".new-task button";
    const PROJECT_DROPDOWN_SELECTOR = ".advanced_task_create_panel .container_dropdown .drop-link"
    const PROJECT_ITEM_SELECTOR = ".advanced_task_create_panel .project-area-dropdown-list .project-section .menu-item";
    const NAME_INPUT_SELECTOR = ".advanced_task_create_panel [data-id='name_input'] input";
    const SUBMIT_SELECTOR = ".advanced_task_create_panel [data-id='submit'] button";
    const DIALOG_SELECTOR = ".advanced_task_create_panel";

    const MAX_WAIT = 500;
    const MULTI_ACTIONS_DELAY = 100;

    function createTasks(tasks, projectName) {
        createTasksRecursive([...tasks].reverse(), projectName);
    }

    function createTasksRecursive(tasks, projectName) {
        if (tasks && tasks.length === 1) {
            createTask(tasks[0], projectName);
            return;
        }

        createTasksRecursive([tasks.pop()], projectName);
        setTimeout(() => createTasksRecursive(tasks, projectName), MULTI_ACTIONS_DELAY);
    }

    function createTask(taskName, projectName) {
        click(CREATE_TASK_BUTTON_SELECTOR);
        click(PROJECT_DROPDOWN_SELECTOR);

        let projectSelected = false;
        selectAll(PROJECT_ITEM_SELECTOR).forEach(node => {
            if (node.innerText.trim() === projectName) {
                node.click();
                projectSelected = true;
            }
        });

        if (!projectSelected) {
            throw new Error(`Project ${projectName} not found`);
        }

        const nameInput = select(NAME_INPUT_SELECTOR);

        if (!nameInput) {
            throw new Error(`Failed to locate name input ${NAME_INPUT_SELECTOR}`);
        }

        nameInput.value = taskName;

        click(SUBMIT_SELECTOR);

        if (document.querySelector(DIALOG_SELECTOR)) {
            throw new Error(`Failed to create task: ${taskName}`);
        }
    }

    function click(selector) {
        const btn = select(selector);

        if (!btn) {
            throw new Error(`Failed to click control. Element not found: ${CREATE_TASK_BUTTON_SELECTOR}`);
        }

        btn.click();
    }

    function select(selector) {
        const start = Date.now();

        while (Date.now() - start <= MAX_WAIT) {
            const node = document.querySelector(selector);

            if (node) {
                return node;
            }
        }

        throw new Error(`Failed to locate ${selector} (${MAX_WAIT} ms waited)}`);
    }

    function selectAll(selector) {
        const start = Date.now();

        while (Date.now() - start <= MAX_WAIT) {
            const nodes = document.querySelectorAll(selector);

            if (nodes.length) {
                return nodes;
            }
        }

        throw new Error(`Failed to locate all ${selector} (${MAX_WAIT} ms waited)}`);
    }

    const projectName = window.__projectsExtProjectName;
    const taskNames = window.__projectsExtTaskNames;

    if (!projectName) {
        alert("Project/Area cannot be empty");
    } else if (!taskNames || !taskNames.length) {
        alert("No task names specified");
    } else {
        createTasks(taskNames, projectName);
    }
})();

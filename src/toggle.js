// Script to handle toggling between GitHub and Azure DevOps controls
(function() {
    const sourceToggle = document.getElementById("source-toggle");
    const githubControls = document.getElementById("github-controls");
    const azureControls = document.getElementById("azure-controls");

    // Add event listeners to the toggle switches
    sourceToggle.addEventListener("change", toggleSourceControls);

    // Function to toggle between GitHub and Azure DevOps controls
    function toggleSourceControls() {
        if (!sourceToggle.checked) {
            githubControls.removeAttribute("hidden");
            azureControls.setAttribute("hidden", "");
        } else {
            githubControls.setAttribute("hidden", "");
            azureControls.removeAttribute("hidden");
        }
    }

    // Initialize the controls based on the default selection
    toggleSourceControls();
})();

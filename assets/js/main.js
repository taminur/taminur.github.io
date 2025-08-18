function updateYear() {
    document.getElementById('year').textContent = new Date().getFullYear();
    }

// Run after footer is loaded
async function include(file, id, callback) {
    const response = await fetch(file);
    const content = await response.text();
    document.getElementById(id).innerHTML = content;
    if (callback) callback();
    }

include("/includes/header.html", "header");
include("/includes/footer.html", "footer", updateYear);
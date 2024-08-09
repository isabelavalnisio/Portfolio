document.addEventListener("DOMContentLoaded", function () {
    const themeCheckbox = document.querySelector('.theme .input');
    const body = document.body;

    themeCheckbox.addEventListener('change', function () {
        if (this.checked) {
            body.classList.add('dark-theme');
        } else {
            body.classList.remove('dark-theme');
        }
    });
});

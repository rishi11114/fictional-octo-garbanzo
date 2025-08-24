// Signature pointer gradient (subtle, respects motion prefs)
(function () {
  const root = document.documentElement;
  const update = (e) => {
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    root.style.setProperty("--pointer-x", x.toString());
    root.style.setProperty("--pointer-y", y.toString());
  };
  if (window.matchMedia("(prefers-reduced-motion: no-preference)").matches) {
    window.addEventListener("pointermove", update);
  }
})();

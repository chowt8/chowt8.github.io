const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const faders = document.querySelectorAll(".fade-in");

if (prefersReducedMotion) {
  faders.forEach(fader => fader.classList.add("appear"));
} else {
  const appearOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px 100px 0px"
  };

  const appearOnScroll = new IntersectionObserver(function(entries, appearOnScroll) {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("appear");
      appearOnScroll.unobserve(entry.target);
    });
  }, appearOptions);

  faders.forEach(fader => appearOnScroll.observe(fader));
}

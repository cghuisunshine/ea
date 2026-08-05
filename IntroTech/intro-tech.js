(function () {
  const root = document.documentElement;
  const themeButton = document.querySelector('[data-action="theme"]');
  const savedTheme = localStorage.getItem('introTechTheme');
  if (savedTheme) root.dataset.theme = savedTheme;

  function updateThemeLabel() {
    if (themeButton) themeButton.textContent = root.dataset.theme === 'dark' ? 'Light mode' : 'Dark mode';
  }
  updateThemeLabel();
  themeButton?.addEventListener('click', function () {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('introTechTheme', root.dataset.theme);
    updateThemeLabel();
  });

  document.querySelector('[data-action="print"]')?.addEventListener('click', function () { window.print(); });

  const progress = document.querySelector('.reading-progress');
  function updateProgress() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const value = max > 0 ? (window.scrollY / max) * 100 : 0;
    if (progress) progress.style.width = value + '%';
  }
  addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  const sections = Array.from(document.querySelectorAll('.lesson'));
  const navLinks = Array.from(document.querySelectorAll('.nav-list a'));
  const observer = new IntersectionObserver(function (entries) {
    const visible = entries.filter(function (entry) { return entry.isIntersecting; })
      .sort(function (a, b) { return b.intersectionRatio - a.intersectionRatio; })[0];
    if (!visible) return;
    navLinks.forEach(function (link) {
      link.classList.toggle('active', link.getAttribute('href') === '#' + visible.target.id);
    });
  }, { rootMargin: '-20% 0px -65% 0px', threshold: [0, 0.2, 0.5] });
  sections.forEach(function (section) { observer.observe(section); });

  const jump = document.querySelector('.mobile-jump');
  jump?.addEventListener('change', function () {
    const target = document.querySelector(jump.value);
    if (target) { target.open = true; target.scrollIntoView(); }
  });

  const search = document.querySelector('.section-search');
  const noResults = document.querySelector('.no-results');
  search?.addEventListener('input', function () {
    const query = search.value.trim().toLowerCase();
    let shown = 0;
    sections.forEach(function (section) {
      const match = !query || section.textContent.toLowerCase().includes(query);
      section.hidden = !match;
      if (match) shown += 1;
    });
    navLinks.forEach(function (link) {
      const section = document.querySelector(link.getAttribute('href'));
      link.parentElement.hidden = section ? section.hidden : false;
    });
    if (noResults) noResults.style.display = shown ? 'none' : 'block';
  });

  const pageKey = document.body.dataset.page || 'intro-tech';
  const savedFields = Array.from(document.querySelectorAll('[data-save]'));
  savedFields.forEach(function (field) {
    const key = pageKey + ':' + field.id;
    const value = localStorage.getItem(key);
    if (value !== null) field.value = value;
    field.addEventListener('input', function () {
      localStorage.setItem(key, field.value);
      const status = field.closest('.planner')?.nextElementSibling;
      if (status?.classList.contains('save-status')) status.textContent = 'Saved in this browser.';
    });
  });

  const dataNode = document.getElementById('quiz-data');
  const quizBox = document.querySelector('.quiz-box');
  if (dataNode && quizBox) {
    const questions = JSON.parse(dataNode.textContent);
    quizBox.innerHTML = questions.map(function (item, index) {
      const options = item.options.map(function (option, optionIndex) {
        return '<label class="quiz-option"><input type="radio" name="q' + index + '" value="' + optionIndex + '"> ' + option + '</label>';
      }).join('');
      return '<div class="quiz-item" id="quiz-' + index + '"><fieldset><legend>' + (index + 1) + '. ' + item.question + '</legend>' + options + '</fieldset><div class="quiz-feedback" aria-live="polite"></div></div>';
    }).join('');

    document.querySelector('[data-action="check-quiz"]')?.addEventListener('click', function () {
      let score = 0;
      questions.forEach(function (item, index) {
        const selected = document.querySelector('input[name="q' + index + '"]:checked');
        const feedback = document.querySelector('#quiz-' + index + ' .quiz-feedback');
        if (!selected) {
          feedback.className = 'quiz-feedback incorrect';
          feedback.textContent = 'Not answered. ' + item.explanation;
        } else if (Number(selected.value) === item.answer) {
          score += 1;
          feedback.className = 'quiz-feedback correct';
          feedback.textContent = 'Correct. ' + item.explanation;
        } else {
          feedback.className = 'quiz-feedback incorrect';
          feedback.textContent = 'Review this one. ' + item.explanation;
        }
      });
      const scoreNode = document.querySelector('.quiz-score');
      if (scoreNode) scoreNode.textContent = 'Score: ' + score + ' / ' + questions.length;
    });
  }
})();

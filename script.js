/* =====================================================
   StudentMind AI — Assessment logic
   Sections below: constants, DOM refs, setup, validation,
   form submission (API request + response handling),
   result rendering, and reset.
   ===================================================== */

const API_URL = 'http://127.0.0.1:8000/predict';

/* A broad list for the country datalist. The backend only keeps a
   handful of these as their own category and groups everything
   else under "Other" — the user can still type any country. */
const COUNTRIES = [
  'India', 'USA', 'Canada', 'Australia', 'UK', 'Germany', 'Mexico', 'Turkey', 'France',
  'Brazil', 'China', 'Japan', 'South Korea', 'Indonesia', 'Pakistan', 'Bangladesh',
  'Nigeria', 'Egypt', 'South Africa', 'Italy', 'Spain', 'Netherlands', 'Sweden',
  'Norway', 'Poland', 'Russia', 'Ukraine', 'Philippines', 'Vietnam', 'Thailand',
  'Malaysia', 'Singapore', 'New Zealand', 'Ireland', 'Argentina', 'Chile', 'Colombia',
  'Saudi Arabia', 'UAE', 'Israel', 'Kenya', 'Other'
];

/* ---------- DOM references ---------- */
const form = document.getElementById('assessmentForm');
const resultCard = document.getElementById('resultCard');
const submitBtn = document.getElementById('submitBtn');
const apiErrorEl = document.getElementById('apiError');
const resetBtn = document.getElementById('resetBtn');
const usageHoursInput = document.getElementById('usageHours');
const usageHoursValue = document.getElementById('usageHoursValue');
const countryList = document.getElementById('countryList');

/* ---------- Setup ---------- */
function populateCountries() {
  countryList.innerHTML = COUNTRIES
    .map((c) => `<option value="${c}"></option>`)
    .join('');
}

function setupRangeDisplay() {
  usageHoursValue.textContent = `${usageHoursInput.value} hrs`;
  usageHoursInput.addEventListener('input', () => {
    usageHoursValue.textContent = `${usageHoursInput.value} hrs`;
  });
}

/* ---------- Validation ----------
   Mirrors the FastAPI Pydantic constraints so the user gets
   inline feedback before a network request is ever made. */
const VALIDATORS = {
  age: (v) => (v !== '' && Number(v) >= 10 && Number(v) <= 100) ? '' : 'Enter an age between 10 and 100.',
  gender: (v) => (v ? '' : 'Select a gender.'),
  country: (v) => (v.trim() ? '' : 'Enter your country.'),
  academicLevel: (v) => (v ? '' : 'Select an academic level.'),
  platform: (v) => (v ? '' : 'Select a platform.'),
  purpose: (v) => (v ? '' : 'Select a purpose of use.'),
  usageHours: (v) => (v !== '' && Number(v) >= 0 && Number(v) <= 26) ? '' : 'Enter a value between 0 and 26.',
  unlocks: (v) => (v !== '' && Number(v) >= 0) ? '' : 'Enter 0 or more.',
  studyHours: (v) => (v !== '' && Number(v) >= 0 && Number(v) <= 24) ? '' : 'Enter a value between 0 and 24.',
  activityHours: (v) => (v !== '' && Number(v) >= 0 && Number(v) <= 24) ? '' : 'Enter a value between 0 and 24.',
  sleepHours: (v) => (v !== '' && Number(v) >= 0 && Number(v) <= 24) ? '' : 'Enter a value between 0 and 24.',
  stressLevel: (v) => (v ? '' : 'Select a stress level.'),
};

function validateField(id) {
  const el = document.getElementById(id);
  const errorEl = document.getElementById(`err-${id}`);
  const message = VALIDATORS[id](el.value);
  el.closest('.field').classList.toggle('has-error', Boolean(message));
  if (errorEl) errorEl.textContent = message;
  return message === '';
}

function validateAll() {
  const ids = Object.keys(VALIDATORS);
  const results = ids.map(validateField);
  return results.every(Boolean);
}

function attachLiveValidation() {
  Object.keys(VALIDATORS).forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener('blur', () => validateField(id));
    el.addEventListener('change', () => validateField(id));
  });
}

/* ---------- Form data collection ----------
   Field names match the FastAPI Pydantic model exactly. */
function collectFormData() {
  return {
    Age: Number(document.getElementById('age').value),
    Gender: document.getElementById('gender').value,
    Country: document.getElementById('country').value.trim(),
    Academic_Level: document.getElementById('academicLevel').value,
    Most_Used_Platform: document.getElementById('platform').value,
    Purpose_Of_Use: document.getElementById('purpose').value,
    Avg_Daily_Usage_Hours: Number(document.getElementById('usageHours').value),
    Daily_Unlocks: Number(document.getElementById('unlocks').value),
    Study_Hours: Number(document.getElementById('studyHours').value),
    Physical_Activity_Hours: Number(document.getElementById('activityHours').value),
    Sleep_Hours_Per_Night: Number(document.getElementById('sleepHours').value),
    Stress_Level: document.getElementById('stressLevel').value,
  };
}

/* ---------- Loading state ---------- */
function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.classList.toggle('is-loading', isLoading);
}

function showApiError(message) {
  apiErrorEl.textContent = message;
  apiErrorEl.hidden = false;
}

function hideApiError() {
  apiErrorEl.hidden = true;
  apiErrorEl.textContent = '';
}

/* ---------- API request + response handling ---------- */
async function requestPrediction(payload) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    // Surface FastAPI/Pydantic validation errors when available.
    let detail = `Request failed (status ${response.status}).`;
    try {
      const errorBody = await response.json();
      if (errorBody && errorBody.detail) {
        detail = typeof errorBody.detail === 'string'
          ? errorBody.detail
          : JSON.stringify(errorBody.detail);
      }
    } catch (_) { /* response wasn't JSON — keep default message */ }
    throw new Error(detail);
  }

  return response.json(); // { predicted_mental_health_score: number }
}

/* ---------- Result rendering ---------- */
function interpretScore(score) {
  if (score >= 7.5) return 'Your responses suggest a generally positive wellbeing pattern.';
  if (score >= 5) return 'Your responses suggest a moderate wellbeing pattern, with some room to recover balance.';
  return 'Your responses suggest a lower wellbeing pattern. Consider small, steady changes — and reach out to someone you trust if things feel heavy.';
}

function setRingProgress(circle, fraction, circumference) {
  const offset = circumference - fraction * circumference;
  circle.style.strokeDasharray = `${circumference}`;
  circle.style.strokeDashoffset = `${circumference}`; // start empty for a smooth reveal
  requestAnimationFrame(() => {
    circle.style.strokeDashoffset = `${offset}`;
  });
}

function renderScore(score) {
  const clamped = Math.max(0, Math.min(10, score));
  const fraction = clamped / 10;

  document.getElementById('scoreNumber').textContent = clamped.toFixed(2);

  const rings = [
    { el: document.querySelector('.ring-progress-1'), r: 104 },
    { el: document.querySelector('.ring-progress-2'), r: 86 },
    { el: document.querySelector('.ring-progress-3'), r: 68 },
  ];
  rings.forEach(({ el, r }, i) => {
    const circumference = 2 * Math.PI * r;
    // Each ring reveals the same fraction with a slight stagger for a
    // "breathing outward" effect that echoes the hero's signature motif.
    setTimeout(() => setRingProgress(el, fraction, circumference), i * 120);
  });

  document.getElementById('resultInterpretation').textContent = interpretScore(clamped);
}

function renderBreakdown(data) {
  // Each metric is shown against a sensible reference max purely for
  // visual scale — this does not imply the model weighs them equally.
  const stressToFraction = { Low: 0.25, Medium: 0.5, High: 0.75, 'Very High': 1 };

  const metrics = [
    { label: 'Sleep', value: `${data.Sleep_Hours_Per_Night} hrs`, fraction: data.Sleep_Hours_Per_Night / 12 },
    { label: 'Study', value: `${data.Study_Hours} hrs`, fraction: data.Study_Hours / 12 },
    { label: 'Physical activity', value: `${data.Physical_Activity_Hours} hrs`, fraction: data.Physical_Activity_Hours / 6 },
    { label: 'Social media use', value: `${data.Avg_Daily_Usage_Hours} hrs`, fraction: data.Avg_Daily_Usage_Hours / 26 },
    { label: 'Stress level', value: data.Stress_Level, fraction: stressToFraction[data.Stress_Level] ?? 0 },
  ];

  const grid = document.getElementById('breakdownGrid');
  grid.innerHTML = metrics.map((m, i) => `
    <div class="breakdown-row">
      <span class="breakdown-label">${m.label}</span>
      <div class="breakdown-track">
        <div class="breakdown-fill" data-target="${Math.min(1, Math.max(0, m.fraction)) * 100}" id="fill-${i}"></div>
      </div>
      <span class="breakdown-value">${m.value}</span>
    </div>
  `).join('');

  // Animate fills after insertion.
  requestAnimationFrame(() => {
    metrics.forEach((_, i) => {
      const fillEl = document.getElementById(`fill-${i}`);
      fillEl.style.width = `${fillEl.dataset.target}%`;
    });
  });
}

function showResult(score, submittedData) {
  renderScore(score);
  renderBreakdown(submittedData);
  resultCard.hidden = false;
  form.hidden = true;
  resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- Reset ---------- */
function resetAssessment() {
  form.reset();
  form.hidden = false;
  resultCard.hidden = true;
  hideApiError();
  Object.keys(VALIDATORS).forEach((id) => {
    document.getElementById(id).closest('.field').classList.remove('has-error');
    const errorEl = document.getElementById(`err-${id}`);
    if (errorEl) errorEl.textContent = '';
  });
  usageHoursInput.value = 4.5;
  usageHoursValue.textContent = '4.5 hrs';
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- Submit handler ---------- */
async function handleSubmit(event) {
  event.preventDefault();
  hideApiError();

  if (!validateAll()) {
    const firstError = form.querySelector('.has-error input, .has-error select');
    if (firstError) firstError.focus();
    return;
  }

  const payload = collectFormData();
  setLoading(true);

  try {
    const result = await requestPrediction(payload);
    showResult(result.predicted_mental_health_score, payload);
  } catch (err) {
    // Network failure (server not running) vs. a handled API error.
    if (err instanceof TypeError) {
      showApiError('Unable to connect to the prediction server. Make sure FastAPI is running at http://127.0.0.1:8000.');
    } else {
      showApiError(err.message || 'Something went wrong while analyzing your responses.');
    }
  } finally {
    setLoading(false);
  }
}

/* ---------- Init ---------- */
populateCountries();
setupRangeDisplay();
attachLiveValidation();
form.addEventListener('submit', handleSubmit);
resetBtn.addEventListener('click', resetAssessment);

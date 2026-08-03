(() => {
  "use strict";

  const setupScreen = document.getElementById("setupScreen");
  const timerScreen = document.getElementById("timerScreen");
  const startBtn = document.getElementById("startBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const resetBtn = document.getElementById("resetBtn");
  const phaseLabel = document.getElementById("phaseLabel");
  const timeDisplay = document.getElementById("timeDisplay");
  const roundInfo = document.getElementById("roundInfo");
  const progressFill = document.getElementById("progressFill");
  const statusMsg = document.getElementById("statusMsg");
  const wakeLockBadge = document.getElementById("wakeLockBadge");

  const workTimeInput = document.getElementById("workTime");
  const restTimeInput = document.getElementById("restTime");
  const roundsInput = document.getElementById("rounds");
  const prepTimeInput = document.getElementById("prepTime");

  const PHASES = { PREP: "prep", WORK: "work", REST: "rest", DONE: "done" };

  let plan = null;
  let currentIndex = 0;
  let remaining = 0;
  let phaseDuration = 0;
  let tickHandle = null;
  let isPaused = false;

  // ---------- Audio (Web Audio API, no external files needed) ----------
  let audioCtx = null;

  function getAudioCtx() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctx();
    }
    return audioCtx;
  }

  function beep(freq, durationMs, volume = 0.2) {
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.value = volume;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch (e) {
      /* audio not available, ignore */
    }
  }

  function playPhaseSound(phase) {
    if (phase === PHASES.WORK) {
      beep(880, 180);
    } else if (phase === PHASES.REST) {
      beep(440, 180);
    } else if (phase === PHASES.PREP) {
      beep(660, 120);
    } else if (phase === PHASES.DONE) {
      beep(660, 150);
      setTimeout(() => beep(880, 150), 180);
      setTimeout(() => beep(1046, 250), 360);
    }
  }

  function playCountdownTick() {
    beep(300, 80, 0.12);
  }

  // ---------- Wake Lock ----------
  // Uses the Screen Wake Lock API (supported in current Chrome, Edge, Opera,
  // Android browsers and Safari 16.4+) to keep the display on while a
  // workout is running.
  let wakeLock = null;

  async function requestWakeLock() {
    if (!("wakeLock" in navigator)) {
      setStatus(
        "Dieser Browser unterstuetzt keine automatische Bildschirm-Sperre-Deaktivierung. Bitte Display-Timeout manuell anpassen."
      );
      return;
    }
    try {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => {
        wakeLock = null;
        updateWakeBadge(false);
      });
      updateWakeBadge(true);
      setStatus("");
    } catch (err) {
      setStatus("Bildschirm-Sperre konnte nicht deaktiviert werden: " + err.message);
    }
  }

  function releaseWakeLock() {
    if (wakeLock) {
      wakeLock.release().catch(() => {});
      wakeLock = null;
    }
    updateWakeBadge(false);
  }

  function updateWakeBadge(active) {
    wakeLockBadge.hidden = !active;
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && isRunning() && !isPaused) {
      requestWakeLock();
    }
  });

  // ---------- Timer core ----------

  function isRunning() {
    return tickHandle !== null;
  }

  function buildPlan() {
    const work = Math.max(1, parseInt(workTimeInput.value, 10) || 0);
    const rest = Math.max(0, parseInt(restTimeInput.value, 10) || 0);
    const rounds = Math.max(1, parseInt(roundsInput.value, 10) || 0);
    const prep = Math.max(0, parseInt(prepTimeInput.value, 10) || 0);

    const steps = [];
    if (prep > 0) {
      steps.push({ phase: PHASES.PREP, duration: prep, round: 0 });
    }
    for (let r = 1; r <= rounds; r++) {
      steps.push({ phase: PHASES.WORK, duration: work, round: r });
      const isLastRound = r === rounds;
      if (rest > 0 && !isLastRound) {
        steps.push({ phase: PHASES.REST, duration: rest, round: r });
      }
    }
    steps.push({ phase: PHASES.DONE, duration: 0, round: rounds });
    return { steps, totalRounds: rounds };
  }

  function setStatus(msg) {
    statusMsg.textContent = msg;
  }

  const PHASE_TEXT = {
    [PHASES.PREP]: "Bereit machen",
    [PHASES.WORK]: "Belastung",
    [PHASES.REST]: "Pause",
    [PHASES.DONE]: "Fertig!",
  };

  function applyPhaseStyles(phase) {
    phaseLabel.classList.remove("phase-work", "phase-rest", "phase-prep");
    progressFill.classList.remove("phase-work", "phase-rest", "phase-prep");
    if (phase === PHASES.WORK) {
      phaseLabel.classList.add("phase-work");
      progressFill.classList.add("phase-work");
    } else if (phase === PHASES.REST) {
      phaseLabel.classList.add("phase-rest");
      progressFill.classList.add("phase-rest");
    } else if (phase === PHASES.PREP) {
      phaseLabel.classList.add("phase-prep");
      progressFill.classList.add("phase-prep");
    }
  }

  function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function renderStep() {
    const step = plan.steps[currentIndex];
    phaseLabel.textContent = PHASE_TEXT[step.phase];
    applyPhaseStyles(step.phase);
    if (step.phase === PHASES.DONE) {
      timeDisplay.textContent = "\u{1F389}";
      roundInfo.textContent = `${plan.totalRounds} Runden geschafft`;
      progressFill.style.width = "100%";
    } else {
      timeDisplay.textContent = formatTime(remaining);
      roundInfo.textContent = `Runde ${step.round} / ${plan.totalRounds}`;
      const pct = ((phaseDuration - remaining) / phaseDuration) * 100;
      progressFill.style.width = `${pct}%`;
    }
  }

  function startStep(index) {
    currentIndex = index;
    const step = plan.steps[index];

    if (step.phase === PHASES.DONE) {
      playPhaseSound(PHASES.DONE);
      renderStep();
      stopTicking();
      releaseWakeLock();
      pauseBtn.textContent = "Pause";
      setStatus("Training beendet.");
      return;
    }

    remaining = step.duration;
    phaseDuration = step.duration;
    playPhaseSound(step.phase);
    renderStep();
  }

  function tick() {
    remaining -= 1;
    if (remaining <= 3 && remaining > 0) {
      playCountdownTick();
    }
    if (remaining < 0) {
      startStep(currentIndex + 1);
      return;
    }
    renderStep();
  }

  function startTicking() {
    stopTicking();
    tickHandle = setInterval(tick, 1000);
  }

  function stopTicking() {
    if (tickHandle) {
      clearInterval(tickHandle);
      tickHandle = null;
    }
  }

  function startWorkout() {
    plan = buildPlan();
    setupScreen.hidden = true;
    timerScreen.hidden = false;
    isPaused = false;
    pauseBtn.textContent = "Pause";
    setStatus("");
    requestWakeLock();
    startStep(0);
    startTicking();
  }

  function togglePause() {
    if (!plan) return;
    if (plan.steps[currentIndex].phase === PHASES.DONE) return;

    isPaused = !isPaused;
    if (isPaused) {
      stopTicking();
      pauseBtn.textContent = "Weiter";
      releaseWakeLock();
      setStatus("Pausiert.");
    } else {
      startTicking();
      pauseBtn.textContent = "Pause";
      requestWakeLock();
      setStatus("");
    }
  }

  function resetWorkout() {
    stopTicking();
    releaseWakeLock();
    plan = null;
    currentIndex = 0;
    remaining = 0;
    isPaused = false;
    progressFill.style.width = "0%";
    setStatus("");
    timerScreen.hidden = true;
    setupScreen.hidden = false;
  }

  startBtn.addEventListener("click", startWorkout);
  pauseBtn.addEventListener("click", togglePause);
  resetBtn.addEventListener("click", resetWorkout);
})();
